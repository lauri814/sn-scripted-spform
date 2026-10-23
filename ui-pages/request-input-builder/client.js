(function () {
    'use strict';
    function start() {
        var sourceElement = document.getElementById('source-data');
        if (!sourceElement) return;
        if (window.scriptedInputBuilderCleanup) window.scriptedInputBuilderCleanup();
        var status = document.getElementById('builder-status');
        // Counter, context summary, and advanced JSON are optional presentation.
        // A modal/customized template may omit them; form state and preview must
        // not depend on those elements being present.
        function setText(id, text) {
            var element = document.getElementById(id);
            if (element) element.textContent = text;
        }
        var source;
        try {source = JSON.parse(decodeURIComponent(sourceElement.value));}
        catch (error) {status.textContent = 'Question data could not be read. Update both UI Page code fields.'; return;}
        if (source.error) {status.textContent = source.error; return;}
        var canvas = document.getElementById('form-canvas');
        var button = document.getElementById('preview-form');
        var frame = document.getElementById('form-preview');
        var layout = document.getElementById('form-layout');
        var title = document.getElementById('input-form-title');
        var columns = [[], []], sequence = 0, columnCount = 1;
        var previewReady = false, previewStarted = false, pendingDefinition;
        var types = [
            ['singleLineText', 'Single line text'], ['multiLineText', 'Multiline text'],
            ['yesNo', 'Yes / No'], ['checkbox', 'Checkbox'], ['selectBox', 'Select box'],
            ['multipleChoice', 'Multiple choice'], ['numericScale', 'Numeric scale'],
            ['reference', 'Reference'], ['listCollector', 'List collector'],
            ['date', 'Date'], ['dateTime', 'Date / time'], ['email', 'Email'],
            ['url', 'URL'], ['ipAddress', 'IP address'], ['duration', 'Duration'],
            ['masked', 'Masked'], ['wideSingleLineText', 'Wide single line text']
        ];
        setText('source-summary', source.taskNumber +
            (source.ritmNumber ? ' / ' + source.ritmNumber : ''));
        function node(tag, css, text) {
            var el = document.createElement(tag);
            if (css) el.className = css;
            if (text !== undefined) el.textContent = text;
            return el;
        }
        function action(text, label, fn, disabled) {
            var el = node('button', 'btn btn-default btn-sm', text);
            el.type = 'button'; el.disabled = !!disabled;
            el.setAttribute('aria-label', label); el.addEventListener('click', fn);
            return el;
        }
        function control(parent, labelText, el, id) {
            var group = node('div', 'form-group');
            var label = node('label', '', labelText);
            el.id = id; label.htmlFor = id;
            group.appendChild(label); group.appendChild(el); parent.appendChild(group);
            return el;
        }
        function input(value) {var el = node('input', 'form-control'); el.type = 'text'; el.value = value; return el;}
        function dropdown(items, value) {
            var el = node('select', 'form-control');
            items.forEach(function (item) {var opt = node('option', '', item[1]); opt.value = item[0]; opt.disabled = !!item[2]; el.appendChild(opt);});
            el.value = value;
            return el;
        }
        function all() {return columns[0].concat(columnCount === 2 ? columns[1] : []);}
        function sourceQuestion(id) {return source.questions.filter(function (q) {return q.id === id;})[0];}
        function selectedElsewhere(id, card) {return all().some(function (q) {return q !== card && q.sourceId === id;});}
        function valid(card) {
            if (card.origin === 'variable') {var q = sourceQuestion(card.sourceId); return q && q.supported;}
            if (!card.label.trim()) return false;
            if (card.fieldType === 'selectBox' || card.fieldType === 'multipleChoice')
                return card.choices.length > 0 && card.choices.every(function (choice) {return choice.label.trim();});
            if (card.fieldType === 'numericScale') return Number.isInteger(card.min) && Number.isInteger(card.max) &&
                card.max >= card.min && card.max - card.min <= 1000;
            return true;
        }
        function field(card) {
            var q = sourceQuestion(card.sourceId);
            var options = card.origin === 'variable' && q ? JSON.parse(JSON.stringify(q.options)) : {};
            options.mandatory = card.mandatory;
            if (card.origin === 'new') {
                if (card.fieldType === 'reference' || card.fieldType === 'listCollector') options.reference = card.reference;
                if (card.fieldType === 'selectBox' || card.fieldType === 'multipleChoice')
                    options.choices = card.choices.map(function (choice) {return {id: choice.id, label: choice.label, value: choice.id};});
                if (card.fieldType === 'numericScale') {options.min = card.min; options.max = card.max;}
            }
            return {id: card.origin === 'variable' ? 'source-' + card.sourceId : card.id,
                kind: 'field', name: card.origin === 'variable' ? 'input_' + card.sourceId : card.id,
                fieldType: card.origin === 'variable' && q ? q.fieldType : card.fieldType,
                label: card.origin === 'variable' && q ? q.label : card.label, options: options};
        }
        function definition() {
            var result = {schemaVersion: 1, id: 'agent-input-form', title: title.value || 'Additional information needed', elements: []};
            result.elements.push({id: 'form-layout', kind: 'container', name: 'input_questions', label: '',
                options: {layout: columnCount === 2 ? '2down' : 'normal'},
                columns: columns.slice(0, columnCount).map(function (cards, index) {
                    return {id: 'column-' + index, elements: cards.filter(valid).map(field)};
                })});
            return result;
        }
        function changed(message) {
            var cards = all(), complete = cards.filter(valid).length;
            button.disabled = !cards.length || complete !== cards.length;
            setText('selected-count', String(cards.length));
            setText('generated-definition', JSON.stringify(definition(), null, 2));
            status.textContent = complete !== cards.length ? 'Complete each question before previewing.' :
                message + (previewStarted ? ' Choose Update preview to show your changes.' : '');
        }
        function add(origin, column) {
            sequence++;
            var card = {id: 'question_' + sequence, origin: origin, sourceId: '', fieldType: 'singleLineText',
                label: '', mandatory: false, choices: [], choiceSequence: 0, min: 0, max: 5, reference: 'sys_user'};
            columns[column].push(card);
            render(); changed('Question added.');
            var focus = document.getElementById(card.id + (origin === 'variable' ? '-source' : '-label'));
            if (focus && focus.focus) focus.focus();
        }
        function renderCard(card, column, index) {
            var wrapper = node('div', 'panel panel-default');
            wrapper.setAttribute('data-question-id', card.id);
            var header = node('div', 'panel-heading', (index + 1) + '. ' +
                (card.origin === 'variable' ? 'From variable' : 'New question'));
            wrapper.appendChild(header);
            var body = node('div', 'panel-body'); wrapper.appendChild(body);
            if (card.origin === 'variable') {
                var items = [['', 'Select a variable…']];
                source.questions.forEach(function (q) {
                    if (!selectedElsewhere(q.id, card)) items.push([q.id, q.label +
                        (q.supported ? '' : ' — ' + q.reason), !q.supported]);
                });
                var select = control(body, 'Variable', dropdown(items, card.sourceId), card.id + '-source');
                select.addEventListener('change', function () {card.sourceId = select.value; render(); changed('Variable selected.');});
                if (items.length === 1) body.appendChild(node('p', 'help-block', 'No more supported variables are available on this task. Choose New question instead.'));
                var selected = sourceQuestion(card.sourceId);
                if (selected) body.appendChild(node('p', 'text-muted', 'Type: ' + selected.fieldType + '. Current answer will not be copied.'));
            } else {
                var type = control(body, 'Question type', dropdown(types, card.fieldType), card.id + '-type');
                type.addEventListener('change', function () {card.fieldType = type.value; render(); changed('Question type updated.');});
                var label = control(body, 'Label', input(card.label), card.id + '-label');
                label.maxLength = 200;
                label.addEventListener('input', function () {card.label = label.value; changed('Question label updated.');});
                if (card.fieldType === 'reference' || card.fieldType === 'listCollector') {
                    var reference = control(body, 'Records to select', dropdown([
                        ['sys_user', 'Users'], ['sys_user_group', 'Groups'], ['cmdb_ci', 'Configuration items']
                    ], card.reference), card.id + '-reference');
                    reference.addEventListener('change', function () {card.reference = reference.value; changed('Reference updated.');});
                }
                if (card.fieldType === 'numericScale') {
                    ['min', 'max'].forEach(function (key) {
                        var number = input(String(card[key])); number.type = 'number'; number.step = '1';
                        control(body, key === 'min' ? 'Minimum' : 'Maximum', number, card.id + '-' + key);
                        number.addEventListener('input', function () {card[key] = number.value === '' ? NaN : Number(number.value); changed('Scale updated.');});
                    });
                }
                if (card.fieldType === 'selectBox' || card.fieldType === 'multipleChoice') {
                    card.choices.forEach(function (choice, choiceIndex) {
                        var choiceInput = control(body, 'Choice ' + (choiceIndex + 1), input(choice.label), card.id + '-' + choice.id);
                        choiceInput.maxLength = 200;
                        choiceInput.addEventListener('input', function () {choice.label = choiceInput.value; changed('Choice updated.');});
                        body.appendChild(action('Remove choice', 'Remove choice ' + (choiceIndex + 1), function () {
                            card.choices.splice(choiceIndex, 1); render(); changed('Choice removed.');
                        }));
                    });
                    body.appendChild(action('+ Add choice', 'Add choice', function () {
                        card.choiceSequence++; card.choices.push({id: 'choice_' + card.choiceSequence, label: ''});
                        render(); changed('Choice added.');
                    }));
                }
            }
            var mandatoryLabel = node('label', 'checkbox-inline');
            var mandatory = node('input'); mandatory.type = 'checkbox'; mandatory.checked = card.mandatory;
            mandatory.addEventListener('change', function () {card.mandatory = mandatory.checked; changed('Required setting updated.');});
            mandatoryLabel.appendChild(mandatory); mandatoryLabel.appendChild(document.createTextNode(' Required'));
            body.appendChild(node('hr')); body.appendChild(mandatoryLabel);
            var footer = node('div', 'panel-footer'); wrapper.appendChild(footer);
            footer.appendChild(action('Move up', 'Move question up', function () {
                if (!index) return;
                columns[column].splice(index, 1); columns[column].splice(index - 1, 0, card);
                render(); changed('Question moved.');
            }, index === 0));
            footer.appendChild(document.createTextNode(' '));
            footer.appendChild(action('Move down', 'Move question down', function () {
                if (index === columns[column].length - 1) return;
                columns[column].splice(index, 1); columns[column].splice(index + 1, 0, card);
                render(); changed('Question moved.');
            }, index === columns[column].length - 1));
            if (columnCount === 2) {
                footer.appendChild(document.createTextNode(' '));
                footer.appendChild(action(column ? 'Move left' : 'Move right', 'Move to other column', function () {
                    columns[column].splice(index, 1); columns[1 - column].push(card);
                    render(); changed('Question moved to other column.');
                }));
            }
            footer.appendChild(document.createTextNode(' '));
            footer.appendChild(action('Remove', 'Remove question', function () {
                columns[column].splice(index, 1); render(); changed('Question removed.');
            }));
            return wrapper;
        }
        function render() {
            canvas.textContent = '';
            for (var i = 0; i < columnCount; i++) (function (column) {
                var area = node('div', columnCount === 2 ? 'col-sm-6' : 'col-sm-12');
                area.appendChild(node('h4', 'text-muted', 'Column ' + (column + 1)));
                columns[column].forEach(function (card, index) {area.appendChild(renderCard(card, column, index));});
                if (!columns[column].length) area.appendChild(node('p', 'text-muted', 'Add your first question here.'));
                var menu = node('div', 'well well-sm'); menu.style.display = 'none';
                menu.appendChild(action('From variable', 'Add question from a task variable', function () {add('variable', column);}));
                menu.appendChild(document.createTextNode(' '));
                menu.appendChild(action('New question', 'Add a new question', function () {add('new', column);}));
                var plus = action('+ Add question', 'Add question to column ' + (column + 1), function () {
                    var open = menu.style.display === 'none';
                    menu.style.display = open ? 'block' : 'none'; plus.setAttribute('aria-expanded', String(open));
                });
                plus.setAttribute('aria-expanded', 'false');
                area.appendChild(plus); area.appendChild(menu); canvas.appendChild(area);
            })(i);
        }
        layout.addEventListener('change', function () {
            columnCount = Number(layout.value) === 2 ? 2 : 1;
            if (columnCount === 1) {columns[0] = columns[0].concat(columns[1]); columns[1] = [];}
            render(); changed(columnCount === 1 ? 'One column selected. Right-column questions were appended to the left column.' : 'Two columns selected.');
        });
        title.addEventListener('input', function () {changed('Title updated.');});
        render(); changed('Use + Add question to start building your form.');
        function send() {
            if (previewReady && pendingDefinition) frame.contentWindow.postMessage({type: 'scripted-input-preview',
                definition: pendingDefinition, taskId: source.taskId}, window.location.origin);
        }
        function onMessage(event) {
            if (!previewStarted || event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
            if (event.data && event.data.type === 'scripted-input-preview-result') status.textContent = event.data.error || 'Preview updated. Source variables stay unchanged.';
            if (event.data && event.data.type === 'scripted-input-preview-ready') {previewReady = true; send();}
        }
        window.addEventListener('message', onMessage);
        window.scriptedInputBuilderCleanup = function () {window.removeEventListener('message', onMessage);};
        frame.addEventListener('load', function () {
            if (previewStarted) frame.contentWindow.postMessage({type: 'scripted-input-preview-ping'}, window.location.origin);
        });
        button.addEventListener('click', function () {
            if (!all().length || !all().every(valid)) return;
            pendingDefinition = definition();
            if (!previewStarted) {
                previewStarted = true; frame.style.display = 'block';
                var placeholder = document.getElementById('preview-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                button.textContent = 'Update preview'; frame.setAttribute('src', frame.getAttribute('data-src'));
            }
            status.textContent = previewReady ? 'Loading preview…' : 'Loading the preview page…'; send();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
