#target illustrator

(function () {
    var BRAND = "AweddenMacros";
    var GRID_LAYER_NAME = "AweddenMacros Grid";
    var SLIDE_NUM_LAYER_NAME = "AweddenMacros Slide Numbers";

    if (app.documents.length === 0) {
        alert("No Illustrator document is open.\n\nPlease open a document and run the script again.", BRAND);
        return;
    }

    var doc = app.activeDocument;
    var originalInteraction = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {
        var settings = showMainDialog(doc);
        if (!settings) {
            app.userInteractionLevel = originalInteraction;
            return;
        }

        var progress = createProgressPalette("Preparing...");
        progress.show();

        var artboardIndexes = getTargetArtboards(doc, settings.processMode);
        if (!artboardIndexes.length) {
            progress.close();
            alert("No artboards found to process.", BRAND);
            app.userInteractionLevel = originalInteraction;
            return;
        }

        updateProgress(progress, 2, "Creating / refreshing grid layers...");
        var gridLayer = getOrCreateLayer(doc, GRID_LAYER_NAME);
        gridLayer.locked = false;
        gridLayer.visible = true;

        var slideNumLayer = null;
        if (settings.createSlideNumbers) {
            slideNumLayer = getOrCreateLayer(doc, SLIDE_NUM_LAYER_NAME);
            slideNumLayer.locked = false;
            slideNumLayer.visible = true;
        }

        clearGeneratedItemsForTargets(gridLayer, artboardIndexes);
        if (slideNumLayer) clearGeneratedItemsForTargets(slideNumLayer, artboardIndexes);

        var gridsByArtboard = {};
        var totalSteps = artboardIndexes.length * 5 + 8;
        var currentStep = 3;

        for (var i = 0; i < artboardIndexes.length; i++) {
            var abIndex = artboardIndexes[i];
            updateProgress(progress, Math.round((currentStep / totalSteps) * 100), "Generating grid for artboard " + (abIndex + 1) + "...");
            gridsByArtboard[abIndex] = createGridForArtboard(doc, gridLayer, abIndex, settings);
            currentStep++;
        }

        updateProgress(progress, Math.round((currentStep / totalSteps) * 100), "Resolving title layer...");
        var titleLayer = findLayerByNameRecursive(doc, settings.titleLayerName);
        if (!titleLayer) {
            progress.close();
            alert("The selected Title Text Layer could not be found.\nPlease run the script again and select a valid layer.", BRAND);
            app.userInteractionLevel = originalInteraction;
            return;
        }
        currentStep++;

        for (var j = 0; j < artboardIndexes.length; j++) {
            var index = artboardIndexes[j];
            var grid = gridsByArtboard[index];

            updateProgress(progress, Math.round((currentStep / totalSteps) * 100), "Aligning title text on artboard " + (index + 1) + "...");
            alignTitlesOnArtboard(doc, titleLayer, index, grid, settings);
            currentStep++;

            updateProgress(progress, Math.round((currentStep / totalSteps) * 100), "Normalizing title line spacing on artboard " + (index + 1) + "...");
            normalizeTitleLeadingOnArtboard(doc, titleLayer, index, settings);
            currentStep++;

            updateProgress(progress, Math.round((currentStep / totalSteps) * 100), "Aligning layout objects on artboard " + (index + 1) + "...");
            alignArtboardItems(doc, index, grid, settings, titleLayer, gridLayer, slideNumLayer);
            currentStep++;

            if (settings.createSlideNumbers) {
                updateProgress(progress, Math.round((currentStep / totalSteps) * 100), "Creating / aligning slide numbers on artboard " + (index + 1) + "...");
                createOrAlignSlideNumber(doc, slideNumLayer, index, grid, settings);
            }
            currentStep++;
        }

        updateProgress(progress, 98, "Final cleanup...");
        gridLayer.locked = true;
        if (slideNumLayer) slideNumLayer.locked = true;

        try { app.redraw(); } catch (e1) {}
        updateProgress(progress, 100, "Completed.");
        $.sleep(300);
        progress.close();

        alert(
            "Alignment complete.\n\n" +
            "Processed artboards: " + artboardIndexes.length + "\n" +
            "Grid layer: " + GRID_LAYER_NAME + "\n" +
            (settings.createSlideNumbers ? ("Slide number layer: " + SLIDE_NUM_LAYER_NAME + "\n") : "") +
            "\nGrid created with even rows and even columns.",
            BRAND
        );

    } catch (err) {
        try { app.redraw(); } catch (e2) {}
        alert("The script stopped because of an error:\n\n" + err.message, BRAND);
    } finally {
        app.userInteractionLevel = originalInteraction;
    }

    // =========================
    // UI
    // =========================
    function showMainDialog(doc) {
        var layerNames = getAllLayerNames(doc);
        if (!layerNames.length) {
            alert("No layers were found in the current document.", BRAND);
            return null;
        }

        var w = new Window("dialog", BRAND);
        w.orientation = "column";
        w.alignChildren = "fill";

        var p1 = w.add("panel", undefined, "Run Options");
        p1.orientation = "column";
        p1.alignChildren = "left";
        p1.margins = 12;

        var modeGroup = p1.add("group");
        modeGroup.orientation = "row";
        modeGroup.add("statictext", undefined, "Process:");
        var rbAll = modeGroup.add("radiobutton", undefined, "All Artboards");
        var rbCurrent = modeGroup.add("radiobutton", undefined, "Current Artboard Only");
        rbAll.value = true;

        var titleSizeGroup = p1.add("group");
        titleSizeGroup.add("statictext", undefined, "Title Text Size:");
        var titleSizeInput = titleSizeGroup.add("edittext", undefined, "48");
        titleSizeInput.characters = 8;

        var titleLayerGroup = p1.add("group");
        titleLayerGroup.orientation = "row";
        titleLayerGroup.add("statictext", undefined, "Title Text Layer:");
        var ddTitleLayer = titleLayerGroup.add("dropdownlist", undefined, layerNames);
        ddTitleLayer.selection = 0;
        ddTitleLayer.minimumSize.width = 260;

        var p2 = w.add("panel", undefined, "Slide Number Options");
        p2.orientation = "column";
        p2.alignChildren = "left";
        p2.margins = 12;

        var slideGroup = p2.add("group");
        slideGroup.add("statictext", undefined, "Create Slide Numbers?");
        var rbSlideYes = slideGroup.add("radiobutton", undefined, "Yes");
        var rbSlideNo = slideGroup.add("radiobutton", undefined, "No");
        rbSlideYes.value = true;

        var slideSizeGroup = p2.add("group");
        slideSizeGroup.add("statictext", undefined, "Slide Number Size:");
        var slideSizeInput = slideSizeGroup.add("edittext", undefined, "18");
        slideSizeInput.characters = 8;

        rbSlideYes.onClick = rbSlideNo.onClick = function () {
            slideSizeInput.enabled = rbSlideYes.value;
        };
        slideSizeInput.enabled = rbSlideYes.value;

        var p3 = w.add("panel", undefined, "Grid Recipe");
        p3.orientation = "column";
        p3.alignChildren = "left";
        p3.margins = 12;

        var g1 = p3.add("group");
        g1.add("statictext", undefined, "Columns:");
        var colsInput = g1.add("edittext", undefined, "12");
        colsInput.characters = 6;

        var g2 = p3.add("group");
        g2.add("statictext", undefined, "Rows:");
        var rowsInput = g2.add("edittext", undefined, "12");
        rowsInput.characters = 6;

        var g3 = p3.add("group");
        g3.add("statictext", undefined, "Margin %:");
        var marginInput = g3.add("edittext", undefined, "6");
        marginInput.characters = 6;

        var g4 = p3.add("group");
        g4.add("statictext", undefined, "Gutter %:");
        var gutterInput = g4.add("edittext", undefined, "2.5");
        gutterInput.characters = 6;

        var btns = w.add("group");
        btns.alignment = "right";
        var ok = btns.add("button", undefined, "Run", {name: "ok"});
        btns.add("button", undefined, "Cancel", {name: "cancel"});

        ok.onClick = function () {
            var titleSize = parseFloat(titleSizeInput.text);
            var slideSize = parseFloat(slideSizeInput.text);
            var cols = parseInt(colsInput.text, 10);
            var rows = parseInt(rowsInput.text, 10);
            var marginPct = parseFloat(marginInput.text);
            var gutterPct = parseFloat(gutterInput.text);

            if (isNaN(titleSize) || titleSize <= 0) {
                alert("Please enter a valid Title Text Size.", BRAND);
                return;
            }
            if (rbSlideYes.value && (isNaN(slideSize) || slideSize <= 0)) {
                alert("Please enter a valid Slide Number Size.", BRAND);
                return;
            }
            if (isNaN(cols) || cols < 2) {
                alert("Columns must be 2 or greater.", BRAND);
                return;
            }
            if (isNaN(rows) || rows < 2) {
                alert("Rows must be 2 or greater.", BRAND);
                return;
            }
            if (isNaN(marginPct) || marginPct <= 0 || marginPct >= 20) {
                alert("Margin % should be a practical value, such as 5 to 8.", BRAND);
                return;
            }
            if (isNaN(gutterPct) || gutterPct < 0 || gutterPct >= 10) {
                alert("Gutter % should be a practical value, such as 2 to 4.", BRAND);
                return;
            }
            if (!ddTitleLayer.selection) {
                alert("Please select a Title Text Layer.", BRAND);
                return;
            }
            w.close(1);
        };

        var result = w.show();
        if (result !== 1) return null;

        return {
            processMode: rbAll.value ? "all" : "current",
            titleTextSize: parseFloat(titleSizeInput.text),
            titleLeading: Math.round(parseFloat(titleSizeInput.text) * 0.92),
            createSlideNumbers: rbSlideYes.value,
            slideNumberSize: parseFloat(slideSizeInput.text || "18"),
            titleLayerName: ddTitleLayer.selection.text,
            columns: parseInt(colsInput.text, 10),
            rows: parseInt(rowsInput.text, 10),
            marginPct: parseFloat(marginInput.text),
            gutterPct: parseFloat(gutterInput.text)
        };
    }

    function createProgressPalette(initialText) {
        var w = new Window("palette", BRAND);
        w.orientation = "column";
        w.alignChildren = "fill";
        w.margins = 12;

        w.msg = w.add("statictext", undefined, initialText);
        w.msg.preferredSize.width = 340;

        w.bar = w.add("progressbar", undefined, 0, 100);
        w.bar.preferredSize.width = 340;

        return w;
    }

    function updateProgress(w, value, text) {
        try {
            w.bar.value = value;
            w.msg.text = text;
            w.update();
        } catch (e) {}
    }

    // =========================
    // Core
    // =========================
    function getTargetArtboards(doc, mode) {
        var arr = [];
        if (mode === "current") {
            arr.push(doc.artboards.getActiveArtboardIndex());
        } else {
            for (var i = 0; i < doc.artboards.length; i++) arr.push(i);
        }
        return arr;
    }

    function getOrCreateLayer(doc, name) {
        var lyr = findLayerByNameRecursive(doc, name);
        if (lyr) return lyr;
        lyr = doc.layers.add();
        lyr.name = name;
        return lyr;
    }

    function findLayerByNameRecursive(parent, name) {
        var layers = parent.layers;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].name === name) return layers[i];
            var nested = findLayerByNameRecursive(layers[i], name);
            if (nested) return nested;
        }
        return null;
    }

    function getAllLayerNames(doc) {
        var out = [];
        collectLayerNames(doc, out);
        return out;
    }

    function collectLayerNames(parent, out) {
        for (var i = 0; i < parent.layers.length; i++) {
            out.push(parent.layers[i].name);
            collectLayerNames(parent.layers[i], out);
        }
    }

    function clearGeneratedItemsForTargets(layer, artboardIndexes) {
        var keep = {};
        for (var i = 0; i < artboardIndexes.length; i++) keep["AB_" + artboardIndexes[i]] = true;

        for (var j = layer.pageItems.length - 1; j >= 0; j--) {
            var it = layer.pageItems[j];
            if (it.note && keep[it.note]) {
                try { it.remove(); } catch (e) {}
            }
        }
        for (var k = layer.groupItems.length - 1; k >= 0; k--) {
            var g = layer.groupItems[k];
            if (g.note && keep[g.note]) {
                try { g.remove(); } catch (e2) {}
            }
        }
    }

    function createGridForArtboard(doc, gridLayer, artboardIndex, settings) {
        var ab = doc.artboards[artboardIndex];
        var r = ab.artboardRect; // [left, top, right, bottom]

        var left = r[0];
        var top = r[1];
        var right = r[2];
        var bottom = r[3];

        var artW = right - left;
        var artH = top - bottom;

        var cols = Math.max(2, parseInt(settings.columns, 10));
        var rows = Math.max(2, parseInt(settings.rows, 10));

        var marginXPct = settings.marginPct / 100.0;
        var marginYPct = settings.marginPct / 100.0;
        var gutterXPct = settings.gutterPct / 100.0;
        var gutterYPct = settings.gutterPct / 100.0;

        var marginX = artW * marginXPct;
        var marginY = artH * marginYPct;

        var usableLeft = left + marginX;
        var usableTop = top - marginY;
        var usableRight = right - marginX;
        var usableBottom = bottom + marginY;

        var usableW = usableRight - usableLeft;
        var usableH = usableTop - usableBottom;

        var gutterX = artW * gutterXPct;
        var gutterY = artH * gutterYPct;

        var totalGutterW = gutterX * (cols - 1);
        var totalGutterH = gutterY * (rows - 1);

        var colWidth = (usableW - totalGutterW) / cols;
        var rowHeight = (usableH - totalGutterH) / rows;

        if (colWidth <= 0 || rowHeight <= 0) {
            throw new Error("Grid calculation failed. Reduce margin/gutter values or reduce number of rows/columns.");
        }

        var g = gridLayer.groupItems.add();
        g.name = "Grid_AB_" + (artboardIndex + 1);
        g.note = "AB_" + artboardIndex;

        var boundary = g.pathItems.rectangle(usableTop, usableLeft, usableW, usableH);
        boundary.stroked = true;
        boundary.filled = false;
        boundary.strokeWidth = 0.5;
        boundary.name = "GridBoundary";

        var xLines = [];
        var currentX = usableLeft;
        xLines.push(currentX);

        for (var c = 0; c < cols; c++) {
            currentX += colWidth;
            xLines.push(currentX);
            if (c < cols - 1) currentX += gutterX;
        }
        xLines[xLines.length - 1] = usableRight;

        for (var i = 0; i < xLines.length; i++) {
            var vx = xLines[i];
            var vLine = makeLine(g, vx, usableTop, vx, usableBottom);
            vLine.name = "C" + (i + 1);
            vLine.note = "AB_" + artboardIndex;

            var cLabel = g.textFrames.pointText([vx + 2, usableTop - 2]);
            cLabel.contents = "C" + (i + 1);
            cLabel.name = "C" + (i + 1) + "_Label";
            styleGridLabel(cLabel);
        }

        var yLines = [];
        var currentY = usableTop;
        yLines.push(currentY);

        for (var rr = 0; rr < rows; rr++) {
            currentY -= rowHeight;
            yLines.push(currentY);
            if (rr < rows - 1) currentY -= gutterY;
        }
        yLines[yLines.length - 1] = usableBottom;

        for (var j = 0; j < yLines.length; j++) {
            var hy = yLines[j];
            var hLine = makeLine(g, usableLeft, hy, usableRight, hy);
            hLine.name = "R" + (j + 1);
            hLine.note = "AB_" + artboardIndex;

            var rLabel = g.textFrames.pointText([usableLeft + 2, hy - 2]);
            rLabel.contents = "R" + (j + 1);
            rLabel.name = "R" + (j + 1) + "_Label";
            styleGridLabel(rLabel);
        }

        return {
            artboardIndex: artboardIndex,
            artboardRect: r,
            usableLeft: usableLeft,
            usableTop: usableTop,
            usableRight: usableRight,
            usableBottom: usableBottom,
            usableWidth: usableW,
            usableHeight: usableH,
            columns: cols,
            rows: rows,
            gutterX: gutterX,
            gutterY: gutterY,
            colWidth: colWidth,
            rowHeight: rowHeight,
            xLines: xLines,
            yLines: yLines
        };
    }

    function makeLine(parent, x1, y1, x2, y2) {
        var p = parent.pathItems.add();
        p.setEntirePath([[x1, y1], [x2, y2]]);
        p.stroked = true;
        p.filled = false;
        p.strokeWidth = 0.35;
        return p;
    }

    function styleGridLabel(tf) {
        try {
            tf.textRange.characterAttributes.size = 7;
            tf.textRange.characterAttributes.autoLeading = false;
            tf.textRange.characterAttributes.leading = 7;
        } catch (e) {}
    }

    function alignTitlesOnArtboard(doc, titleLayer, artboardIndex, grid, settings) {
        var titles = getItemsOnArtboardFromLayer(titleLayer, artboardIndex, true);
        for (var i = 0; i < titles.length; i++) {
            var tf = titles[i];
            if (tf.typename !== "TextFrame") continue;
            if (isLockedOrHidden(tf)) continue;

            try {
                tf.textRange.characterAttributes.size = settings.titleTextSize;
                tf.textRange.characterAttributes.autoLeading = false;
                tf.textRange.characterAttributes.leading = settings.titleLeading;
            } catch (e) {}

            moveTitleToC1R3(tf, grid);
        }
    }

    function normalizeTitleLeadingOnArtboard(doc, titleLayer, artboardIndex, settings) {
        var titles = getItemsOnArtboardFromLayer(titleLayer, artboardIndex, true);
        for (var i = 0; i < titles.length; i++) {
            var tf = titles[i];
            if (tf.typename !== "TextFrame") continue;
            if (isLockedOrHidden(tf)) continue;
            try {
                tf.textRange.characterAttributes.autoLeading = false;
                tf.textRange.characterAttributes.leading = settings.titleLeading;
            } catch (e) {}
        }
    }

    function moveTitleToC1R3(tf, grid) {
        var targetLeft = grid.xLines[0];
        var targetTop = grid.yLines[Math.min(2, grid.yLines.length - 1)];
        setItemPositionTopLeft(tf, targetLeft, targetTop);
    }

    function alignArtboardItems(doc, artboardIndex, grid, settings, titleLayer, gridLayer, slideNumLayer) {
        var items = getEligibleItemsOnArtboard(doc, artboardIndex, gridLayer, slideNumLayer);
        var placed = [];

        var titleItems = getItemsOnArtboardFromLayer(titleLayer, artboardIndex, true);
        for (var t = 0; t < titleItems.length; t++) {
            if (titleItems[t].typename === "TextFrame") {
                placed.push(getGeometricBounds(titleItems[t]));
            }
        }

        items.sort(function (a, b) {
            var ga = getGeometricBounds(a), gb = getGeometricBounds(b);
            if (Math.abs(gb.top - ga.top) > 2) return gb.top - ga.top;
            return ga.left - gb.left;
        });

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (belongsToLayer(it, titleLayer)) continue;
            if (slideNumLayer && belongsToLayer(it, slideNumLayer)) continue;
            if (belongsToLayer(it, gridLayer)) continue;
            if (isLockedOrHidden(it)) continue;
            if (!isProcessable(it)) continue;

            var newPos = findBestGridPosition(it, grid, placed);
            if (newPos) {
                moveItemPreserveSize(it, newPos.left, newPos.top);
                placed.push(getGeometricBounds(it));
            } else {
                keepInsideGrid(it, grid);
                placed.push(getGeometricBounds(it));
            }
        }
    }

    function createOrAlignSlideNumber(doc, slideNumLayer, artboardIndex, grid, settings) {
        var existing = findSlideNumberForArtboard(slideNumLayer, artboardIndex);
        var tf = existing;

        if (!tf) {
            tf = slideNumLayer.textFrames.pointText([grid.usableRight, grid.usableBottom]);
            tf.note = "AB_" + artboardIndex;
            tf.name = "SlideNumber_AB_" + (artboardIndex + 1);
        }

        tf.contents = (artboardIndex + 1).toString();

        try {
            tf.textRange.characterAttributes.size = settings.slideNumberSize;
            tf.textRange.characterAttributes.autoLeading = false;
            tf.textRange.characterAttributes.leading = settings.slideNumberSize;
        } catch (e) {}

        var gb = getGeometricBounds(tf);
        var w = gb.right - gb.left;
        var h = gb.top - gb.bottom;

        var targetRight = grid.usableRight;
        var targetBottom = grid.usableBottom;

        tf.position = [targetRight - w, targetBottom + h];
    }

    function findSlideNumberForArtboard(layer, artboardIndex) {
        for (var i = 0; i < layer.textFrames.length; i++) {
            var tf = layer.textFrames[i];
            if (tf.note === "AB_" + artboardIndex) return tf;
        }
        return null;
    }

    function getEligibleItemsOnArtboard(doc, artboardIndex, gridLayer, slideNumLayer) {
        var out = [];
        var abRect = doc.artboards[artboardIndex].artboardRect;

        for (var i = 0; i < doc.pageItems.length; i++) {
            var it = doc.pageItems[i];
            if (isLockedOrHidden(it)) continue;
            if (!intersectsArtboard(it, abRect)) continue;
            if (belongsToLayer(it, gridLayer)) continue;
            if (slideNumLayer && belongsToLayer(it, slideNumLayer)) continue;
            out.push(it);
        }
        return out;
    }

    function isProcessable(it) {
        var type = it.typename;
        return (
            type === "TextFrame" ||
            type === "PathItem" ||
            type === "GroupItem" ||
            type === "CompoundPathItem" ||
            type === "PlacedItem" ||
            type === "RasterItem" ||
            type === "SymbolItem" ||
            type === "PluginItem"
        );
    }

    function getItemsOnArtboardFromLayer(layer, artboardIndex, recursive) {
        var items = [];
        var abRect = doc.artboards[artboardIndex].artboardRect;
        collectItemsFromLayer(layer, items, recursive);
        var out = [];
        for (var i = 0; i < items.length; i++) {
            if (intersectsArtboard(items[i], abRect)) out.push(items[i]);
        }
        return out;
    }

    function collectItemsFromLayer(layer, out, recursive) {
        for (var i = 0; i < layer.pageItems.length; i++) out.push(layer.pageItems[i]);
        if (recursive) {
            for (var j = 0; j < layer.layers.length; j++) {
                collectItemsFromLayer(layer.layers[j], out, recursive);
            }
        }
    }

    function belongsToLayer(item, layer) {
        if (!layer) return false;
        try {
            return item.layer === layer;
        } catch (e) {
            return false;
        }
    }

    function isLockedOrHidden(it) {
        try {
            if (it.locked || it.hidden) return true;
            var p = it;
            while (p && p.parent) {
                if (p.typename === "Layer" && (!p.visible || p.locked)) return true;
                p = p.parent;
            }
        } catch (e) {}
        return false;
    }

    function intersectsArtboard(item, abRect) {
        var gb = getGeometricBounds(item);
        if (!gb) return false;

        var abLeft = abRect[0], abTop = abRect[1], abRight = abRect[2], abBottom = abRect[3];

        if (gb.right < abLeft) return false;
        if (gb.left > abRight) return false;
        if (gb.top < abBottom) return false;
        if (gb.bottom > abTop) return false;
        return true;
    }

    function getGeometricBounds(item) {
        var gb = item.geometricBounds;
        return {
            left: gb[0],
            top: gb[1],
            right: gb[2],
            bottom: gb[3]
        };
    }

    function moveItemPreserveSize(item, targetLeft, targetTop) {
        var gb = getGeometricBounds(item);
        var dx = targetLeft - gb.left;
        var dy = targetTop - gb.top;
        item.translate(dx, dy);
    }

    function setItemPositionTopLeft(item, targetLeft, targetTop) {
        moveItemPreserveSize(item, targetLeft, targetTop);
    }

    function keepInsideGrid(item, grid) {
        var gb = getGeometricBounds(item);
        var w = gb.right - gb.left;
        var h = gb.top - gb.bottom;

        var left = gb.left;
        var top = gb.top;

        if (left < grid.usableLeft) left = grid.usableLeft;
        if (left + w > grid.usableRight) left = grid.usableRight - w;
        if (top > grid.usableTop) top = grid.usableTop;
        if (top - h < grid.usableBottom) top = grid.usableBottom + h;

        moveItemPreserveSize(item, left, top);
    }

    function findBestGridPosition(item, grid, placedBounds) {
        var gb = getGeometricBounds(item);
        var w = gb.right - gb.left;
        var h = gb.top - gb.bottom;

        var candidateXs = buildSnapXs(grid, w);
        var candidateYs = buildSnapYs(grid, h);

        var best = null;
        var bestScore = 1e15;

        for (var yi = 0; yi < candidateYs.length; yi++) {
            for (var xi = 0; xi < candidateXs.length; xi++) {
                var left = candidateXs[xi];
                var top = candidateYs[yi];

                var test = {
                    left: left,
                    top: top,
                    right: left + w,
                    bottom: top - h
                };

                if (test.left < grid.usableLeft || test.right > grid.usableRight) continue;
                if (test.top > grid.usableTop || test.bottom < grid.usableBottom) continue;
                if (collides(test, placedBounds)) continue;

                var score = distance2(gb.left, gb.top, left, top);
                if (score < bestScore) {
                    bestScore = score;
                    best = { left: left, top: top };
                }
            }
        }

        return best;
    }

    function buildSnapXs(grid, itemWidth) {
        var xs = [];
        for (var c = 0; c < grid.columns; c++) {
            var colLeft = grid.xLines[c];
            var colRight = grid.xLines[c + 1];

            if (colLeft + itemWidth <= grid.usableRight + 0.1) xs.push(colLeft);
            if (colRight - itemWidth >= grid.usableLeft - 0.1) xs.push(colRight - itemWidth);
        }
        return uniqueRounded(xs);
    }

    function buildSnapYs(grid, itemHeight) {
        var ys = [];
        for (var r = 0; r < grid.rows; r++) {
            var rowTop = grid.yLines[r];
            var rowBottom = grid.yLines[r + 1];

            if (rowTop - itemHeight >= grid.usableBottom - 0.1) ys.push(rowTop);
            if (rowBottom + itemHeight <= grid.usableTop + 0.1) ys.push(rowBottom + itemHeight);
        }
        return uniqueRounded(ys);
    }

    function uniqueRounded(arr) {
        var map = {};
        var out = [];
        for (var i = 0; i < arr.length; i++) {
            var k = Math.round(arr[i] * 100) / 100;
            if (!map[k]) {
                map[k] = true;
                out.push(arr[i]);
            }
        }
        return out;
    }

    function collides(testBounds, placedBounds) {
        for (var i = 0; i < placedBounds.length; i++) {
            if (rectsOverlap(testBounds, placedBounds[i], 3)) return true;
        }
        return false;
    }

    function rectsOverlap(a, b, pad) {
        pad = pad || 0;
        return !(
            a.right + pad <= b.left ||
            a.left >= b.right + pad ||
            a.bottom >= b.top - pad ||
            a.top <= b.bottom + pad
        );
    }

    function distance2(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return dx * dx + dy * dy;
    }

})();