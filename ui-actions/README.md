# Classic task form action

Create a UI Action with these settings:

- Name: **Request additional input**
- Table: **Task [task]** (available on extending tables through inheritance)
- Action name: `request_additional_input`
- Active: true; Client: true; Form button: true
- Show insert: false; Show update: true
- Condition: `!current.isNewRecord() && current.canWrite()`
- Onclick: `openRequestInputBuilder(); return false;`
- Script: contents of `request-input.js`

The action opens `request_input_builder` using the Classic `GlideModal` API and
passes the current task ID as a modal preference. The UI Page reads this
preference as well as the standalone `sysparm_task_id` URL parameter. It resolves
the actual record class server-side for the ESC preview URL.

Keep the UI Page access restricted to the intended agents. The action condition
is a presentation control, not authorization; the task service repeats its ACL
checks on the server. This version does not submit the task, send a notification,
or persist definitions/answers. Drafts are in memory and are lost on closing.
No Workspace action or modal implementation is included.
