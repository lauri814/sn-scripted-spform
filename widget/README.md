# Scripted form widget

Copy `server.js` into the widget Server script and `template.html` into its HTML
template, and `client.js` into its Client script. Install the `ScriptedFormBuilder` and `ScriptedFormDefinition` Script
Includes first. The template uses the supplied client controller and needs no custom CSS.

The template uses Service Portal Bootstrap panel classes and renders
`data.myForm` through `sp-model`, retaining `mandatory="[]"`. The server supplies
`data.formTitle` from the authored definition's title. The translated fallback
heading is “Scripted form”.

Set `data.hide_container = true` in the server script to omit the panel border,
heading, and panel-body padding while retaining the form. The default is false.
An empty model with no sections shows “No questions to display.” The layout is
owned by the model; no extra grid surrounds the native variable layout.

The Save button is a placeholder: after `spModel.gForm.initialized`, it reads
answer values through that form's `g_form` into `c.pendingResponse`. Layout and
non-answer fields are excluded. It displays an explicit local-only status and
makes no server call. It does not update request variables or persist responses,
run submission validation, submit a producer, or notify an end user. Those
integrations remain separate work. The native attachment field can still upload
attachment records independently of this placeholder.

Run `node tests/widget-client.test.js` for the local controller check. In the
portal verify form initialization, editing then clicking Save, readonly fields,
reference values, and the displayed local-only status. The placeholder is not
a completed save workflow.

The `sp-model` binding remains one-time. Replacing the model after initialization
requires separate lifecycle handling and is outside this initial template.
Verify panel appearance, hidden-container mode, empty-state rendering, field
interaction, and column behavior in the ServiceNow portal; local tests do not
compile the Angular template.
