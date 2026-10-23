(function () {
    // A temporary attachment target; no question or catalog item is inserted.
    var builder = new ScriptedFormBuilder({
        attachmentGuid: gs.generateGUID()
    });

    builder
        .singleLineText("single_line_text", "Single Line Text")
        .multiLineText("multi_line_text", "Multi Line Text")
        .reference("reference", "Reference", {
            reference: "sys_user",
            attributes: "ref_ac_columns=email,ref_ac_columns_search=true,ref_ac_order_by=name,ref_auto_completer=AJAXTableCompleter"
        })
        .yesNo("yes_no", "Yes / No", {value: "Yes"})
        .containerStart("more_questions", "More questions", {displayTitle: true})
        .wideSingleLineText("wide_text", "Wide Single Line Text")
        .selectBox("select_box", "Select Box", {
            choices: [{label: "First", value: "first"}, {label: "Second", value: "second"}]
        })
        .multipleChoice("multiple_choice", "Multiple Choice", {
            choices: [{label: "First", value: "first"}, {label: "Second", value: "second"}]
        })
        .numericScale("numeric_scale", "Numeric Scale", {min: 0, max: 5, value: "0"})
        .checkbox("checkbox", "CheckBox")
        .date("date", "Date")
        .dateTime("date_time", "Date/Time")
        .containerSplit()
        .label("contact_label", "Contact details")
        .email("email", "Email")
        .url("url", "URL")
        .ipAddress("ip_address", "IP Address")
        .duration("duration", "Duration")
        .masked("masked", "Masked")
        .listCollector("list_collector", "List Collector", {reference: "sys_user"})
        .containerEnd()
        .breakField("break", "Break")
        .attachment("attachment", "Attachment", {
            maxFileSize: 20,
            allowedExtensions: ""
        })
        .html("html", "HTML")
        .richTextLabel("rich_text_label", "Rich Text Label", {value: "Additional information"});

    // Optional integrations are intentionally explicit:
    // - lookupSelectBox / lookupMultipleChoice require caller-supplied choices.
    // - custom / customWithLabel require an actual widget model.
    // - requestedFor emits a candidate specialized model; native item-access
    //   validation is disabled because there is no persisted catalog item.
    // Attachment uploads persist sys_attachment records against the temporary
    // target GUID. Preserve that GUID if adding server-update flows later.

    data.myForm = builder.build();
})();
