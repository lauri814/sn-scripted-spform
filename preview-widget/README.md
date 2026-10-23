# Agent-only native form preview

Install these three files as a separate Service Portal widget and add it to a
portal page with ID `scripted_input_preview`. The agent selector iframe targets
`/sp?id=scripted_input_preview`; change its portal suffix if necessary. This is
not the end-user input widget and does not save answers.

The parent UI Page sends a generated definition and task ID using same-origin
`postMessage`. Both sides verify the sending window. The widget server reloads
and authorizes the task and its storage-specific variable source for every render, then constructs its own
blank definition from selected question IDs. Browser field options, values,
script sources, and widget models are never forwarded to the builder.

The directive is destroyed and recreated for each successful preview, because
its form-model binding is one-time. Responses from older preview requests are
ignored. Page messages contain metadata only, no current source answer values.

Native rendering uses the agent's session, not an impersonated end user. This
must be tested in an instance; host framing restrictions, native reference
lookup support without question identities, and UI Page ACLs remain deployment
checks. See `ui-pages/request-input-builder/README.md` for installation and scope.
