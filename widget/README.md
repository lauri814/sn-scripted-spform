# Scripted form widget

Copy `server.js` into the widget Server script and `template.html` into its HTML
template. Install the `ScriptedFormBuilder` and `ScriptedFormDefinition` Script
Includes first. The template needs no custom client controller or CSS.

The template uses Service Portal Bootstrap panel classes and renders
`data.myForm` through `sp-model`, retaining `mandatory="[]"`. The server supplies
`data.formTitle` from the authored definition's title. The translated fallback
heading is “Scripted form”.

Set `data.hide_container = true` in the server script to omit the panel border,
heading, and panel-body padding while retaining the form. The default is false.
An empty model with no sections shows “No questions to display.” The layout is
owned by the model; no extra grid surrounds the native variable layout.

No save footer, submission handler, workspace-specific rendering, or success
message is included because those workflows are not implemented. The native
attachment field can still upload attachment records.

The `sp-model` binding remains one-time. Replacing the model after initialization
requires separate lifecycle handling and is outside this initial template.
Verify panel appearance, hidden-container mode, empty-state rendering, field
interaction, and column behavior in the ServiceNow portal; local tests do not
compile the Angular template.
