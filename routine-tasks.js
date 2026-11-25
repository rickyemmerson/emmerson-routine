(function (root) {
  var defaults = [
    {"id":"m_breakfast","name":"Breakfast Eaten","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"m_teeth","name":"Teeth Brushed","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"m_dogfed","name":"Dog Fed","group":"morning","due":"07:45","assignment":"dog","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"m_bed","name":"Bed Made","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"morning_check_0","name":"Shoes and socks","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","morningOnly":true,"btns":[{"key":"complete","label":"Done","pts":0}]},
    {"id":"morning_check_1","name":"Bag packed","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","morningOnly":true,"btns":[{"key":"complete","label":"Done","pts":0}]},
    {"id":"morning_check_2","name":"Breakfast dishes","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","morningOnly":true,"btns":[{"key":"complete","label":"Done","pts":0}]},
    {"id":"morning_check_3","name":"Bathroom tidy","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","morningOnly":true,"btns":[{"key":"complete","label":"Done","pts":0}]},
    {"id":"morning_check_4","name":"Bedroom tidy","group":"morning","due":"07:45","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","morningOnly":true,"btns":[{"key":"complete","label":"Done","pts":0}]},
    {"id":"as_homework","name":"Homework","group":"school","due":"18:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"as_music","name":"Music Practice","group":"school","due":"18:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"as_bedroom","name":"Bedroom Clean","group":"school","due":"18:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"spotless","label":"Spotless","pts":4},{"key":"tidy","label":"Tidy","pts":1},{"key":"no","label":"No","pts":0}]},
    {"id":"as_dogwalk","name":"Dog Walk","group":"school","due":"18:00","assignment":"dog","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"as_poopatrol","name":"Poo Patrol","group":"school","due":"18:00","assignment":"dog","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"as_dogfed","name":"Dog Fed","group":"school","due":"18:00","assignment":"dog","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"as_washing","name":"Clean Washing Away","group":"school","due":"18:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_lunch","name":"School Lunch Packed","group":"dinner","due":"20:00","assignment":"both","days":[0,1,2,3,4],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_kitchen","name":"Kitchen Duty","group":"dinner","due":"20:00","assignment":"kitchen","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"spotless","label":"Spotless","pts":4},{"key":"tidy","label":"Tidy","pts":1},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_shower","name":"Shower under 6 minutes?","group":"dinner","due":"20:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_clothes","name":"Dirty Clothes Away","group":"dinner","due":"20:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_bag","name":"School Bag Packed","group":"dinner","due":"20:00","assignment":"both","days":[0,1,2,3,4],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_teeth","name":"Teeth Brushed","group":"dinner","due":"20:00","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"yes","label":"Yes","pts":2},{"key":"no","label":"No","pts":0}]},
    {"id":"ad_bed","name":"In Bed, Lights Off","group":"dinner","due":"20:30","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"score","btns":[{"key":"8pm","label":"8:00 pm","pts":2},{"key":"830","label":"8:30 pm","pts":0},{"key":"failed","label":"After 8:30 pm","pts":-1}]},
    {"id":"b_bible","name":"Read Bible","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":5}]},
    {"id":"b_dinner","name":"Cook Dinner","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":5}]},
    {"id":"b_bathroom","name":"Clean Bathroom","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":3}]},
    {"id":"b_toilet","name":"Clean Toilet","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":2}]},
    {"id":"b_bin","name":"Take Out Bin","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":2}]},
    {"id":"b_hangwash","name":"Hang Out Washing","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":2}]},
    {"id":"b_bringwash","name":"Bring In Washing","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":2}]},
    {"id":"b_yard","name":"Yard Work","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":2}]},
    {"id":"b_washdog","name":"Wash & Dry Dog","group":"bonus","due":"","assignment":"both","days":[0,1,2,3,4,5,6],"kind":"tick","btns":[{"key":"complete","label":"Done","pts":2}]}
  ];
  var dog = ['abby', 'abby', 'olivia', 'abby', 'olivia', 'abby', 'olivia'];
  var kitchen = [null, 'olivia', 'abby', 'olivia', 'abby', 'olivia', 'abby'];
  var groups = { morning: 'Morning', school: 'After school', dinner: 'After dinner', bonus: 'Bonus tasks' };

  function list(overrides) {
    overrides = overrides || {};
    var ids = defaults.map(function (task) { return task.id; });
    var tasks = defaults.map(function (task) {
      return Object.assign({}, task, overrides[task.id], {id: task.id});
    });
    Object.keys(overrides).sort().forEach(function (id) {
      if (ids.indexOf(id) < 0) tasks.push(Object.assign({}, overrides[id], {id: id}));
    });
    return tasks;
  }

  function assigned(task, girl, day) {
    return !task.archived && task.days.indexOf(day) >= 0 && (
      task.assignment === 'both' || task.assignment === girl ||
      (task.assignment === 'dog' && dog[day] === girl) ||
      (task.assignment === 'kitchen' && kitchen[day] === girl)
    );
  }

  function time(value) {
    if (!value) return '';
    var parts = value.split(':'), hour = Number(parts[0]);
    return (hour % 12 || 12) + ':' + parts[1] + (hour < 12 ? ' am' : ' pm');
  }

  root.RoutineTasks = {list: list, assigned: assigned, time: time, groups: groups};
})(typeof globalThis === 'undefined' ? window : globalThis);
