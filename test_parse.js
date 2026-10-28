"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const markdown_it_1 = __importDefault(require("markdown-it"));
const md = new markdown_it_1.default({
    html: true,
    linkify: true,
    typographer: true,
});
// Custom task list plugin with line numbers
function taskListsPlugin(md) {
    md.core.ruler.after('inline', 'task-lists-with-lines', (state) => {
        const tokens = state.tokens;
        for (let i = 2; i < tokens.length; i++) {
            if (tokens[i].type !== 'inline')
                continue;
            if (tokens[i - 1].type !== 'paragraph_open')
                continue;
            if (tokens[i - 2].type !== 'list_item_open')
                continue;
            const listItem = tokens[i - 2];
            const inlineToken = tokens[i];
            const content = inlineToken.content;
            const match = /^\[([ xX])\][ \t]+(.*)/s.exec(content);
            if (match) {
                const checked = match[1].toLowerCase() === 'x';
                const startLine = listItem.map ? listItem.map[0] : 0;
                // Add task-list-item class
                const currentClass = listItem.attrGet('class') || '';
                listItem.attrSet('class', (currentClass + ' task-list-item').trim());
                // Find parent list and add task-list class
                for (let j = i - 3; j >= 0; j--) {
                    if (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open') {
                        const listClass = tokens[j].attrGet('class') || '';
                        if (!listClass.includes('task-list')) {
                            tokens[j].attrSet('class', (listClass + ' contains-task-list').trim());
                        }
                        break;
                    }
                }
                // Remove [ ] or [x] from inline content and add checkbox token
                inlineToken.content = match[2];
                if (inlineToken.children && inlineToken.children.length > 0) {
                    const firstChild = inlineToken.children[0];
                    if (firstChild.type === 'text') {
                        firstChild.content = firstChild.content.replace(/^\[([ xX])\][ \t]*/, '');
                    }
                }
                const checkboxToken = new state.Token('html_inline', '', 0);
                checkboxToken.content = `<input class="task-list-item-checkbox" type="checkbox" data-line="${startLine}" ${checked ? 'checked' : ''} /> `;
                inlineToken.children = [checkboxToken, ...(inlineToken.children || [])];
            }
        }
    });
}
md.use(taskListsPlugin);
const testMarkdown = `# Todo List
- [ ] Task 1
- [x] Task 2
  - [ ] Subtask 2.1
1. [ ] Ordered task
- Normal list item
`;
console.log(md.render(testMarkdown));
//# sourceMappingURL=test_parse.js.map