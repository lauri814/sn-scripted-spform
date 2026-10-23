const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const context = {Class: {create: () => function () {this.initialize.apply(this, arguments);}},
 gs: {hasRole: role => role === 'itil'}};
vm.createContext(context);
for (const name of ['ScriptedFormBuilder', 'ScriptedFormDefinition', 'TaskInputSource'])
 vm.runInContext(fs.readFileSync(path.join(__dirname, '../script-includes/' + name + '.js'), 'utf8'), context);
const Source = context.TaskInputSource;
const source = new Source();
assert(source._readRoles(''));
assert(source._readRoles('other,itil'));
assert(!source._readRoles('restricted'));
const record = values => ({getValue: key => values[key] || '', getUniqueValue: () => 'a'.repeat(32)});
assert.equal(source._question(record({type: '6', question_text: 'Summary', default_value: 'secret'})).fieldType, 'singleLineText');
assert.equal(source._question(record({type: '15'})).supported, false);
assert.equal(source._question(record({type: '8', reference: 'sys_user', reference_qual: 'active=true'})).supported, false);
assert.equal(source._question(record({type: '8', reference: 'sys_user'})).options.reference, 'sys_user');
assert.equal(source._question(record({type: '4', scale_min: '5', scale_max: '0'})).supported, false);
assert.throws(() => source.read('not-a-task-id'), /from a task/);
let sourceCalls = 0;
const allowed = {id: 'a'.repeat(32), label: 'Summary', fieldType: 'singleLineText', options: {}, supported: true};
const originalRead = Source.prototype.read;
Source.prototype.read = function (task) {
 sourceCalls++;
 if (task !== 'authorized-task') throw new Error('Task access denied');
 return {questions: [allowed]};
};
const preview = fs.readFileSync(path.join(__dirname, '../widget/server.js'), 'utf8');
function render(input) { context.input = input; context.data = {}; vm.runInContext(preview, context); return context.data; }
const good = {action: 'preview', taskId: 'authorized-task', definition: {schemaVersion: 1,
 title: 'Input needed', scripts: [{source: 'malicious'}], elements: [{id: 'source-' + allowed.id,
 fieldType: 'custom', options: {value: 'old answer', widget: {template: 'bad'}}}]}};
const result = render(good);
assert.equal(result.myForm._fields['input_' + allowed.id].type, 'string');
assert.equal(result.myForm._fields['input_' + allowed.id].value, '');
assert.equal(result.myForm.client_script.onLoad.length, 0);
assert.equal(result.formTitle, 'Input needed');
assert(sourceCalls > 0);
assert(render({...good, taskId: 'unauthorized'}).error.includes('access denied'));
const duplicate = JSON.parse(JSON.stringify(good)); duplicate.definition.elements.push(duplicate.definition.elements[0]);
assert(render(duplicate).error);
const stale = JSON.parse(JSON.stringify(good)); stale.definition.elements[0].id = 'missing';
assert(render(stale).error);
console.log('Source conversion and preview boundary checks passed: source types, roles, qualifiers, blank answers, authorization, and browser tampering.');

// Mixed authored/source columns are normalized server-side without scripts/defaults.
const authored = {action: 'preview', taskId: 'authorized-task', definition: {
 schemaVersion: 1, title: 'Authored form', scripts: [{source: 'not allowed'}], elements: [{
  kind: 'container', id: 'browser-layout', columns: [
   {elements: [{id: 'source-' + allowed.id, kind: 'field', options: {mandatory: true, value: 'old'}}]},
   {elements: [{id: 'question_1', kind: 'field', fieldType: 'selectBox', label: 'Pick one', options: {
    mandatory: true, value: 'choice_1', choices: [{label: 'First', value: 'choice_1'}], widget: {template: 'bad'}
   }}]}
  ]
 }]}};
const authoredResult = render(authored);
assert(!authoredResult.error, authoredResult.error);
assert.equal(authoredResult.myForm._sections[0].columns.length, 2);
assert.equal(authoredResult.myForm._sections[0].layout, '2down');
assert.equal(authoredResult.myForm._fields.question_1.value, '');
assert.equal(authoredResult.myForm._fields.question_1.mandatory, true);
assert.equal(authoredResult.myForm._fields['input_' + allowed.id].mandatory, true);
assert.equal(authoredResult.myForm.client_script.onLoad.length, 0);
const unsupported = JSON.parse(JSON.stringify(authored));
unsupported.definition.elements[0].columns[1].elements[0].fieldType = 'custom';
assert(render(unsupported).error.includes('Unsupported new question type'));
const badReference = JSON.parse(JSON.stringify(authored));
badReference.definition.elements[0].columns[1].elements[0].fieldType = 'reference';
badReference.definition.elements[0].columns[1].elements[0].options.reference = 'sys_user_has_role';
assert(render(badReference).error.includes('Choose Users'));
const emptyLabel = JSON.parse(JSON.stringify(authored));
emptyLabel.definition.elements[0].columns[1].elements[0].label = ' ';
assert(render(emptyLabel).error.includes('label'));
const tooManyColumns = JSON.parse(JSON.stringify(authored));
tooManyColumns.definition.elements[0].columns.push({elements: []});
assert(render(tooManyColumns).error.includes('two-column'));
const nested = JSON.parse(JSON.stringify(authored));
nested.definition.elements[0].columns[0].elements[0] = {kind: 'container', id: 'nested'};
assert(render(nested).error.includes('Invalid question'));
console.log('Authored-preview checks passed: mixed columns, blank answers, required flags, source reauthorization, and configuration filtering.');

Source.prototype.read = originalRead;

// Route from any task while preserving that task as the response context.
const taskId = 'b'.repeat(32), ritmId = 'c'.repeat(32);
let taskClass = 'incident', writable = true, ritmReadable = true;
context.GlideRecordSecure = function (table) {
 this.get = id => table === 'task' || table === taskClass || (table === 'sc_req_item' && id === ritmId && ritmReadable);
 this.getRecordClassName = () => table === 'task' ? taskClass : table;
 this.getUniqueValue = () => table === 'sc_req_item' && taskClass !== 'sc_req_item' ? ritmId : taskId;
 this.canRead = () => true;
 this.canWrite = () => writable;
 this.getValue = key => key === 'request_item' ? ritmId : (key === 'number' ? (table === 'sc_req_item' ? 'RITM001' : 'TASK001') : '');
 this.request_item = {canRead: () => true};
 this.instanceOf = name => name === table || name === 'task';
};
const routed = new Source();
let routes;
routed._readCatalog = (id, result) => { routes = ['catalog', id]; };
routed._readRecordProducer = (task, result) => { routes = ['recordProducer', task.getUniqueValue()]; };
let routedResult = routed.read(taskId);
assert.deepEqual(routes, ['recordProducer', taskId]);
assert.equal(routedResult.taskId, taskId);
assert.equal(routedResult.taskTable, 'incident');
assert.equal(routedResult.variableSource.kind, 'recordProducer');
taskClass = 'sc_task';
routedResult = routed.read(taskId);
assert.deepEqual(routes, ['catalog', ritmId]);
assert.equal(routedResult.taskId, taskId);
assert.equal(routedResult.variableSource.recordId, ritmId);
ritmReadable = false;
assert.throws(() => routed.read(taskId), /Requested Item is unavailable/);
ritmReadable = true; writable = false;
assert.throws(() => routed.read(taskId), /cannot edit/);
writable = true; taskClass = 'sc_req_item';
assert.equal(routed.read(taskId).variableSource.kind, 'catalog');
assert.deepEqual(routes, ['catalog', taskId]);
console.log('Task routing checks passed: general tasks, catalog task RITM resolution, direct RITM, and denied access.');
