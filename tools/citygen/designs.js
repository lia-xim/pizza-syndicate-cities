// Entwürfe der fünf Mod-Städte. Jede Funktion bekommt einen leeren Design und zeichnet die Stadt hinein.
// Die Module werden erst beim Aufruf geladen, weil sie ihrerseits generate.js und layout.js brauchen.
'use strict';
module.exports = {
  neapel: d => require('./neapel')(d),
  porto: d => require('./venedig').porto(d),
  manchester: d => require('./manchester')(d),
  miami: d => require('./miami')(d),
  shanghai: d => require('./shanghai')(d),
};
