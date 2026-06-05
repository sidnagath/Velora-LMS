const content = require('fs').readFileSync('views/pages/admin/courses/modules.ejs', 'utf-8');
const scriptMatches = content.match(/<script>([\s\S]*?)<\/script>/g);
const vm = require('vm');
if (scriptMatches) {
  scriptMatches.forEach(s => {
      let code = s.replace(/<script>|<\/script>/g, '').replace(/<%=.*?%>/g, '"mock"');
      try {
          new vm.Script(code);
          console.log('Syntax OK');
      } catch(e) {
          console.error('Syntax Error:', e);
      }
  });
}
