import App from "./App.js"
import Project from "./Project.js"

/*
    A list of projects, and operations to manage projects.
*/
export default class ProjectList {

    projects = [];
    #selected = -1;

    static templates = [
        {key: "blank",   name: "Blank"},
        {key: "basic2d", name: "Basic 2D", default: true},
        {key: "basic3d", name: "Basic 3D"},
    ];

    get selected() {
        return (this.#selected < this.projects.length) ?
            this.projects[this.#selected] :
            null;
    }

    get projectCount() { return this.projects.length; }

    load() {
        // load from disk
        const loaded = localStorage.getItem(App.KEY_PROJ_LIST);

        //
        if (loaded) {
            Project.nextId = loaded.nextProjectId;
            this.projects = loaded.projects;
        }

        if (this.projects.length) {
            this.projects.forEach((item, i) => {
                if (item.selected) {
                    this.#selected = i;
                }
            });
            if (this.#selected == -1) {
                this.#selected = 0;
            }
        }
    }

    save() {
        const obj = {
            nextProjectId: Project.nextId,
            projects: this.projects,
        };
        localStorage.setItem(App.KEY_PROJ_LIST);
    }

    createProjectFromTemplate(template) {
        const item =    ProjectList.templates[template] ||
                        ProjectList.templates.find(t => t.key == template) ||
                        ProjectList.templates.find(t => t.default) ||
                        template;
        if (!item) {
            return null;
        }
        const proj = new Project(item.key);
        this.addEntry(proj.id, proj.name, true);
        return proj;
    }

    addEntry(id, name, selected) {
        projects.push({
            id: id,
            name: name,
            selected: (selected) ? true : false,
        });
    }
}
