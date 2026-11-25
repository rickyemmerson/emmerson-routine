(function () {
  let dialog, form, initial, choiceKey;
  const periods = () => Object.entries(RoutineTasks.groups);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const deadlines = {morning:'07:45',school:'18:00',dinner:'20:00',bonus:''};
  const choices = [{key:'yes',label:'Yes',pts:2},{key:'no',label:'No',pts:0}];
  const overrides = () => appLoad().settings.taskOverrides || {};
  const field = name => form.elements.namedItem(name);

  function chooseJob(id) {
    choiceKey = id;
    initial = RoutineTasks.list(overrides()).find(task => task.id === id) || {
      name:'',group:'morning',due:'07:45',assignment:'both',days:[0,1,2,3,4,5,6],kind:'score',btns:choices
    };
    field('name').value = initial.name;
    field('group').value = initial.group;
    field('due').value = initial.due;
    field('assignment').value = initial.assignment;
    field('kind').value = initial.kind;
    field('morningOnly').checked = Boolean(initial.morningOnly);
    dialog.querySelectorAll('[name=day]').forEach(input => { input.checked = initial.days.includes(Number(input.value)); });
    dialog.querySelector('#editor-archive').hidden = !id;
    dialog.querySelector('#editor-archive').textContent = initial.archived ? 'Restore job' : 'Remove from routine';
    dialog.querySelector('#task-editor-status').textContent = '';
    showChoices();
  }

  function showChoices() {
    const tick = field('group').value === 'bonus' || field('kind').value === 'tick';
    field('kind').disabled = field('group').value === 'bonus';
    dialog.querySelector('#editor-morning-only').hidden = field('group').value !== 'morning';
    const options = tick
      ? [{key:'complete',label:'Done',pts:initial.btns[0].pts}]
      : (initial.kind === 'tick' ? choices : initial.btns);
    dialog.querySelector('#editor-scoring').innerHTML = options.map(option => `
      <div class="editor-option" data-choice="${option.key}">
        <label>Choice<input data-label required maxlength="24" value="${appEscape(option.label)}"${tick||option.key==='no'?' readonly':''}></label>
        <label>Points<input data-points type="number" required min="-100" max="100" step="1" value="${option.pts}"${option.key==='no'?' readonly':''}></label>
      </div>`).join('');
  }

  function writeJob(id, task) {
    appLoad().settings.taskOverrides ||= {};
    appLoad().settings.taskOverrides[id] = task;
    appPersist();
    renderParent();
  }

  function renderPicker(selected) {
    const jobs = RoutineTasks.list(overrides());
    dialog.querySelector('#editor-pick').innerHTML = '<option value="">＋ Add a new job</option>' + periods().map(([group,label]) =>
      `<optgroup label="${label}">${jobs.filter(task=>task.group===group).map(task=>
        `<option value="${task.id}">${appEscape(task.name)}${task.archived?' (removed)':''}</option>`).join('')}</optgroup>`).join('');
    dialog.querySelector('#editor-pick').value = selected;
    chooseJob(selected);
  }

  window.openTaskEditor = function () {
    if (appSession !== 'parent') return;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'task-editor';
      dialog.setAttribute('aria-labelledby','task-editor-title');
      dialog.innerHTML = `
        <header><h2 id="task-editor-title">Manage jobs</h2><button type="button" class="primary-btn" id="editor-close">Close</button></header>
        <label>Choose a job<select id="editor-pick"></select></label>
        <form>
          <label>Job name<input name="name" required maxlength="48"></label>
          <label>Part of the day<select name="group">${periods().map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
          <label>Due time<input type="time" name="due"></label>
          <label>Assigned to<select name="assignment"><option value="both">Both girls</option><option value="abby">Abby</option><option value="olivia">Olivia</option><option value="dog">Dog duty roster</option><option value="kitchen">Kitchen duty roster</option></select></label>
          <fieldset><legend>Days</legend><div class="editor-days">${days.map((day,index)=>`<label><input type="checkbox" name="day" value="${index}"> ${day}</label>`).join('')}</div></fieldset>
          <label>How it’s recorded<select name="kind"><option value="score">Scoring choices</option><option value="tick">Tick box</option></select></label>
          <div id="editor-morning-only"><label><input type="checkbox" name="morningOnly"> Hide after noon</label></div>
          <fieldset><legend>Points</legend><div id="editor-scoring"></div></fieldset>
          <p id="task-editor-status" role="status"></p>
          <div class="editor-actions"><button type="submit" class="primary-btn">Save job</button><button type="button" class="secondary-btn" id="editor-archive">Remove from routine</button></div>
        </form>`;
      document.body.appendChild(dialog);
      form = dialog.querySelector('form');
      dialog.querySelector('#editor-close').onclick = () => dialog.close();
      dialog.querySelector('#editor-pick').onchange = event => chooseJob(event.target.value);
      field('group').onchange = () => { field('due').value = deadlines[field('group').value]; showChoices(); };
      field('kind').onchange = showChoices;
      dialog.querySelector('#editor-archive').onclick = () => {
        if(appSession!=='parent'||!choiceKey)return;
        writeJob(choiceKey,{...initial,archived:!initial.archived});
        renderPicker(choiceKey);
        dialog.querySelector('#task-editor-status').textContent=initial.archived?'Job removed. Previous points are kept.':'Job restored.';
      };
      form.addEventListener('submit',event=>{
        event.preventDefault();
        if(appSession!=='parent')return;
        const name=field('name').value.trim();
        const activeDays=[...dialog.querySelectorAll('[name=day]:checked')].map(input=>Number(input.value));
        const buttons=[...dialog.querySelectorAll('.editor-option')].map(row=>({
          key:row.dataset.choice,label:row.querySelector('[data-label]').value.trim(),pts:Number(row.querySelector('[data-points]').value)
        }));
        const status=dialog.querySelector('#task-editor-status');
        if(!name||!activeDays.length||buttons.some(button=>!button.label)){
          status.textContent='Enter a job name, select at least one day and fill in each choice.';
          return;
        }
        const group=field('group').value;
        const id=choiceKey||('job_'+Date.now()+'_'+crypto.randomUUID().slice(0,8));
        writeJob(id,{
          name,group,due:field('due').value,assignment:field('assignment').value,days:activeDays,
          kind:group==='bonus'?'tick':field('kind').value,btns:buttons,
          morningOnly:group==='morning'&&field('morningOnly').checked,archived:Boolean(initial.archived)
        });
        renderPicker(id);
        status.textContent='Job saved. Existing point entries are kept.';
      });
    }
    renderPicker('');
    dialog.showModal();
  };
})();
