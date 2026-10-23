(function () {
    // Authored definition is kept in memory; no question/script records are created.
    var definition = {
        "schemaVersion": 1,
        "id": "form-demo",
        "title": "Scripted form demo",
        "elements": [
            {
                "id": "field-summary",
                "kind": "field",
                "fieldType": "singleLineText",
                "name": "summary",
                "label": "Summary",
                "options": {
                    "mandatory": true
                }
            },
            {
                "id": "container-details",
                "kind": "container",
                "name": "details",
                "label": "Details",
                "options": {
                    "displayTitle": true,
                    "layout": "2down"
                },
                "columns": [
                    {
                        "id": "column-left",
                        "elements": [
                            {
                                "id": "field-description",
                                "kind": "field",
                                "fieldType": "multiLineText",
                                "name": "description",
                                "label": "Description"
                            },
                            {
                                "id": "field-owner",
                                "kind": "field",
                                "fieldType": "reference",
                                "name": "owner",
                                "label": "Owner",
                                "options": {
                                    "reference": "sys_user"
                                }
                            },
                            {
                                "id": "field-wide_text",
                                "kind": "field",
                                "fieldType": "wideSingleLineText",
                                "name": "wide_text",
                                "label": "Wide Single Line Text"
                            },
                            {
                                "id": "field-multiple_choice",
                                "kind": "field",
                                "fieldType": "multipleChoice",
                                "name": "multiple_choice",
                                "label": "Multiple Choice",
                                "options": {
                                    "choices": [
                                        {
                                            "label": "First",
                                            "value": "first"
                                        },
                                        {
                                            "label": "Second",
                                            "value": "second"
                                        }
                                    ]
                                }
                            },
                            {
                                "id": "field-numeric_scale",
                                "kind": "field",
                                "fieldType": "numericScale",
                                "name": "numeric_scale",
                                "label": "Numeric Scale",
                                "options": {
                                    "min": 0,
                                    "max": 5,
                                    "value": "0"
                                }
                            },
                            {
                                "id": "field-date",
                                "kind": "field",
                                "fieldType": "date",
                                "name": "date",
                                "label": "Date"
                            },
                            {
                                "id": "field-date_time",
                                "kind": "field",
                                "fieldType": "dateTime",
                                "name": "date_time",
                                "label": "Date/Time"
                            }
                        ]
                    },
                    {
                        "id": "column-right",
                        "elements": [
                            {
                                "id": "field-approved",
                                "kind": "field",
                                "fieldType": "checkbox",
                                "name": "approved",
                                "label": "Approved"
                            },
                            {
                                "id": "field-priority",
                                "kind": "field",
                                "fieldType": "selectBox",
                                "name": "priority",
                                "label": "Priority",
                                "options": {
                                    "value": "normal",
                                    "choices": [
                                        {
                                            "id": "choice-normal",
                                            "label": "Normal",
                                            "value": "normal"
                                        },
                                        {
                                            "id": "choice-high",
                                            "label": "High",
                                            "value": "high"
                                        }
                                    ]
                                }
                            },
                            {
                                "id": "field-contact_label",
                                "kind": "field",
                                "fieldType": "label",
                                "name": "contact_label",
                                "label": "Contact details"
                            },
                            {
                                "id": "field-yes_no",
                                "kind": "field",
                                "fieldType": "yesNo",
                                "name": "yes_no",
                                "label": "Yes / No",
                                "options": {
                                    "value": "Yes"
                                }
                            },
                            {
                                "id": "field-email",
                                "kind": "field",
                                "fieldType": "email",
                                "name": "email",
                                "label": "Email"
                            },
                            {
                                "id": "field-url",
                                "kind": "field",
                                "fieldType": "url",
                                "name": "url",
                                "label": "URL"
                            },
                            {
                                "id": "field-ip_address",
                                "kind": "field",
                                "fieldType": "ipAddress",
                                "name": "ip_address",
                                "label": "IP Address"
                            },
                            {
                                "id": "field-duration",
                                "kind": "field",
                                "fieldType": "duration",
                                "name": "duration",
                                "label": "Duration"
                            },
                            {
                                "id": "field-masked",
                                "kind": "field",
                                "fieldType": "masked",
                                "name": "masked",
                                "label": "Masked"
                            },
                            {
                                "id": "field-list_collector",
                                "kind": "field",
                                "fieldType": "listCollector",
                                "name": "list_collector",
                                "label": "List Collector",
                                "options": {
                                    "reference": "sys_user"
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "id": "field-attachment",
                "kind": "field",
                "fieldType": "attachment",
                "name": "attachment",
                "label": "Attachment",
                "options": {
                    "maxFileSize": 20,
                    "allowedExtensions": ""
                }
            },
            {
                "id": "field-break",
                "kind": "field",
                "fieldType": "breakField",
                "name": "break",
                "label": "Break"
            },
            {
                "id": "field-html",
                "kind": "field",
                "fieldType": "html",
                "name": "html",
                "label": "HTML"
            },
            {
                "id": "field-rich_text_label",
                "kind": "field",
                "fieldType": "richTextLabel",
                "name": "rich_text_label",
                "label": "Rich Text Label",
                "options": {
                    "value": "Additional information"
                }
            }
        ],
        "scripts": [
            {
                "id": "script-welcome",
                "name": "Welcome",
                "type": "onLoad",
                "source": "function onLoad() { g_form.addInfoMessage(\"hello world\"); }"
            }
        ]
    };

    // Keep this target GUID when adding server-update flows. Uploads themselves
    // persist sys_attachment records even though the form definition is transient.
    data.myForm = new ScriptedFormDefinition().build(definition, {
        attachmentGuid: gs.generateGUID()
    });
})();
