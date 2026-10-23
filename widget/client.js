api.controller = function ($scope) {
    var c = this;
    var form;

    $scope.$on('spModel.gForm.initialized', function (event, gForm) {
        form = gForm;
        c.formReady = true;
    });

    // Placeholder boundary for a future response-storage service. This never
    // calls request-variable APIs, submits a producer, or claims persistence.
    c.save = function () {
        if (!form || !c.data.myForm)
            return;

        var answers = {};
        angular.forEach(c.data.myForm._fields, function (field, name) {
            if (['container_start', 'checkbox_container', 'label', 'rich_text_label',
                'break', 'formatter', 'widget'].indexOf(field.type) !== -1)
                return;
            answers[name] = form.getValue(name);
        });

        c.pendingResponse = {
            schemaVersion: 1,
            answers: answers
        };
        c.saveStatus = 'Answers collected locally. Saving is not connected yet.';
    };
};
