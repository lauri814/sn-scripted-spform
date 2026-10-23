(function () {
    'use strict';
    function start() {
        var sourceElement = document.getElementById('source-data');
        if (!sourceElement) return;
        var source = JSON.parse(decodeURIComponent(sourceElement.value));
        var status = document.getElementById('builder-status');
        var list = document.getElementById('available-variables');
        var button = document.getElementById('preview-form');
        var frame = document.getElementById('form-preview');
        var selected = [];
        var previewReady = false;
        var previewStarted = false;
        var pendingDefinition;
        if (source.error) { status.textContent = source.error; return; }
        document.getElementById('source-summary').textContent = source.taskNumber + (source.ritmNumber ? ' / ' + source.ritmNumber : '');
        source.questions.forEach(function (question) {
            var row = document.createElement('div');
            row.className = 'checkbox';
            var label = document.createElement('label');
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.disabled = !question.supported;
            checkbox.addEventListener('change', function () {
                if (checkbox.checked) selected.push(question);
                else selected = selected.filter(function (q) { return q.id !== question.id; });
                button.disabled = !selected.length;
                status.textContent = selected.length + ' question(s) selected. Preview order follows selection order.';
            });
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + question.label));
            row.appendChild(label);
            if (!question.supported) {
                var reason = document.createElement('p');
                reason.className = 'help-block'; reason.textContent = question.reason;
                row.appendChild(reason);
            }
            list.appendChild(row);
        });
        if (!source.questions.length) status.textContent = 'No readable stored questions are available for this task source.';
        function send() {
            if (!previewReady || !pendingDefinition) return;
            frame.contentWindow.postMessage({type: 'scripted-input-preview', definition: pendingDefinition, taskId: source.taskId}, window.location.origin);
        }
        window.addEventListener('message', function (event) {
            if (!previewStarted || event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
            if (event.data && event.data.type === 'scripted-input-preview-result') {
                status.textContent = event.data.error || 'Preview updated. No request variables were changed.';
            }
            if (event.data && event.data.type === 'scripted-input-preview-ready') {previewReady = true; send();}
        });
        frame.addEventListener('load', function () {
            if (!previewStarted) return;
            frame.contentWindow.postMessage({type: 'scripted-input-preview-ping'}, window.location.origin);
        });
        button.addEventListener('click', function () {
            if (!selected.length) return;
            pendingDefinition = {
                schemaVersion: 1,
                id: 'agent-input-form',
                title: document.getElementById('input-form-title').value || 'Additional information needed',
                elements: selected.map(function (question) {
                    return {id: 'source-' + question.id, kind: 'field', fieldType: question.fieldType,
                        name: 'input_' + question.id, label: question.label,
                        options: JSON.parse(JSON.stringify(question.options))};
                })
            };
            document.getElementById('generated-definition').textContent = JSON.stringify(pendingDefinition, null, 2);
            if (!previewStarted) {
                previewStarted = true;
                frame.style.display = 'block';
                frame.setAttribute('src', frame.getAttribute('data-src'));
            }
            status.textContent = previewReady ? 'Loading preview…' : 'Waiting for the preview page. Check the portal preview installation if it does not load.';
            send();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
