AweddenMacros Final Grid Align

User Guide / Read Me

Overview

AweddenMacros Final Grid Align is an Adobe Illustrator JSX script that helps clean up and structure existing presentation layouts using a generated modular grid system.

The script works directly in an open Illustrator document. It creates a new grid layer, calculates even column and row divisions based on your chosen settings, and then attempts to reposition existing objects so they align more consistently to that layout system.

This tool is meant for structured visual cleanup, not freeform artistic rearrangement.

What the script does

The script:

works only in an already open Illustrator document
asks whether to process all artboards or only the current artboard
asks for title text size
asks you to select the title text layer
optionally creates slide numbers
creates a dedicated grid layer inside the file
generates even rows and columns based on your inputs
repositions eligible objects to nearest valid grid-aligned positions
aligns selected title text to a consistent anchor position
normalizes title leading for more uniform heading rhythm
keeps slide numbers on a separate layer if enabled
What the script does not do

The script does not:

create a new document
create new artboards
rebuild your design from scratch
perform perfect AI-level layout decisions
guarantee ideal positioning for highly complex artwork
understand creative intent the way a human designer does
work as a full design automation engine

This is a layout alignment and grid cleanup tool.

Best use cases

This script is best suited for:

pitch deck design
portfolio presentation cleanup
brand guideline layouts
agency presentation structure
editorial slide systems
deck layouts with repeated composition logic
multi-artboard documents with text, boxes, and organized layout content
Recommended file structure

For best results:

keep titles on a dedicated title layer
keep decorative elements reasonably organized
unlock objects you want the script to move
avoid excessive clipping masks or deeply nested complex groups
make sure artboards are clearly separated
use logical layer naming
Installation
Save the script file with the .jsx extension.
Open Adobe Illustrator.
Open the Illustrator document you want to clean up.
Run the script from:
File > Scripts > Other Script...
Select the script file.

Optional:
You may also place the script inside Illustrator’s Scripts folder for permanent availability in the Scripts menu.

How to use
Open your Illustrator document.
Run the script.
In the AweddenMacros dialog box:
choose all artboards or current artboard only
enter title text size
select the title text layer
choose whether to create slide numbers
if yes, enter slide number size
enter columns, rows, margin percent, and gutter percent
Click Run.
The script will:
generate the grid
align titles
normalize title leading
reposition eligible layout objects
create slide numbers if enabled
Grid behavior

The script creates a layout grid using:

equal outer margins
equal column widths
equal row heights
equal gutters between columns
equal gutters between rows

This prevents the last column or last row from becoming smaller or irregular.

Title behavior

The selected title layer is treated as the main heading layer.
Title objects on that layer are:

resized to the chosen title size
aligned to a consistent grid anchor
given normalized leading for more even multiline title spacing across artboards
Slide number behavior

If enabled:

slide numbers are created automatically
numbering is based on artboard order
slide numbers are placed in a separate layer
they are aligned consistently across processed artboards
Important notes

Because Illustrator files can vary heavily, results depend on document structure.

Some objects may not move perfectly if they are:

locked
hidden
clipped in complex masks
plugin-based objects
unusually grouped
visually intended to break grid logic

Always review the document after script execution.

Before running the script

It is recommended to:

save a backup copy of your Illustrator file
close unnecessary panels or heavy background processes
unlock items you want adjusted
verify title text is placed on the intended title layer
Limitations

This script is not a substitute for final design judgment.
It is a production-assist alignment tool.

Manual refinement may still be required for:

experimental compositions
highly layered editorial artwork
decorative overflow layouts
rotated complex objects
dense image-mask compositions
documents with inconsistent initial structure
Support note

This product is intended for designers familiar with Adobe Illustrator and basic script execution.
Usage results may vary depending on Illustrator version, document complexity, and layer organization.
