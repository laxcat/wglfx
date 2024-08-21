import App from "./App.mjs"
import Project from "./Project.mjs"
import Serializable from "./Serializable.mjs"
import * as ui from "./util-ui.mjs"

/*
    A list of projects, and operations to manage projects.
*/

class ProjListItem extends Serializable {
    static initProps = {
        id: undefined,
        name: undefined,
    }
}

export default class ProjectList extends Serializable {
    static initProps = {
        nextProjectId:  undefined,
        selectedId:     undefined,
        projLIs:        [ProjListItem],
    }
    el;
    selectEl;
    statusEl;

    // default construction of ProjectList when none found on dist
    static templates = [
        {
            nextProjectId: 1,
            selectedId: undefined,
            projLIs: [],
        }
    ];

// API: INFO ---------------------------------------------------------------- //

    get selected() { return this.itemForId(this.selectedId); }

    get projectCount() { return this.projLIs.length; }

// API: SAVE / LOAD / INIT / UPDATE ----------------------------------------- //

    load() {
        // load from disk
        const loaded = localStorage.getItem(App.KEY_PROJ_LIST);
        if (loaded) {
            this.deserialize(JSON.parse(loaded));
        }
        return this.selected; // ProjListItem (not Project!)
    }

    save() {
        const serialObj = this.serialize();
        localStorage.setItem(App.KEY_PROJ_LIST, JSON.stringify(serialObj));
        console.log("???", serialObj);
        this.updateStatusUI();
        return serialObj;
    }

    // create selected project, or new default one
    // called by App to create the project on first run
    createProject() {
        let proj = this.#createProjectFromId(this.selectedId);
        if (proj) {
            return proj
        }
        // project not found, create new one and update list
        proj = this.#createNewProject();
        this.resetProjListUI();
        this.updateStatusUI(proj);
        return proj;
    }

    updateStatusUI(proj) {
        if (!this.statusEl) return;
        if (!proj) proj = App.project;
        if (proj.id !== this.selectedId) return;
        this.statusEl.classList.toggle("changed", proj.hasChanged());
        this.statusEl.innerHTML = proj.statusStr;
    }

// PROJECT CREATION --------------------------------------------------------- //

    // creates new project from initObj (see Serializable for init rules)
    #createNewProject(initObj) {
        const proj = new Project(initObj);
        proj.id = this.nextProjectId++;
        proj.name = this.#getNewProjectName();
        this.addItem(proj.id, proj.name, true);
        return proj;
    }

    // loads specific project of id, creates Project
    #createProjectFromId(id) {
        if (!id) {
            return null;
        }

        let proj = null;

        try {
            const initObj = Project.load(id, this.itemForId(id)?.name);
            if (initObj) {
                proj = new Project(initObj);
            }
        } catch(e) {
            console.log("WARNING!! Project failed to parse!");
            console.log(e);
            proj = null;
        };

        return proj;
    }

    static #newProjectName = "My Project";
    #getNewProjectName() {
        let name = ProjectList.#newProjectName;
        let i = 2;
        while(this.projLIs.find(li=>li.name===name)) {
            name = `${ProjectList.#newProjectName} (${i})`;
            ++i;
        }
        return name;
    }

// LIST ACTIONS ------------------------------------------------------------- //

    switchProject(id) {
        let proj = this.#createProjectFromId(id);
        while (!proj && this.projectCount) {
            this.findNewSelected();
            proj = this.#createProjectFromId(this.selectedId);
        }
        if (!proj) {
            proj = this.#createNewProject();
        }
        return proj;
    }

    renameCurrentProject() {
        const inputEl = this.selectEl.insertHTMLAfter(`<input type="text">`);

        this.selectEl.classList.toggle("hidden", true);
        inputEl.value = this.selected.name;
        inputEl.focus();
        inputEl.select();

        const cleanup = () => {
            this.selectEl.classList.toggle("hidden", false);
            this.updateStatusUI();
            this.resetProjListUI();
            inputEl.remove();
        };

        inputEl.addEventListener("blur", cleanup);
        inputEl.addEventListener("keydown", e => {
            // some other key
            if (e.key !== "Enter") return;

            // name to set
            const newName = inputEl.value.trim();

            // do nothing if not valid
            if (newName === "") return;

            // set the name and cleanup
            this.selected.name = newName;
            App.project.name = newName;
            App.project.timeChanged = new Date();
            cleanup();
        });
    }

    deleteCurrentProject() {

    }

    addItem(id, name, selected) {
        this.projLIs.push(
            new ProjListItem({id, name})
        );
        if (selected) {
            this.selectedId = id;
        }
    }

    removeItem(id) {
        this.projLIs = this.projLIs.filter(li=>li.id!==id);
        if (id === this.selectedId) {
            this.findNewSelected();
        }
    }

    findNewSelected() {
        if (this.projLIs.length === 0) {
            this.selectedId = undefined;
            return;
        }
        this.selectedId = this.projLIs[0].id;
    }

    itemForId(id) {
        return (!id) ? undefined :
            this.projLIs.find(li=>li.id===id);
    }

// UI ----------------------------------------------------------------------- //

    createUI(parentEl) {
        const proj = App.project;
        // add pass ui
        let v = 1;
        this.el = parentEl.appendHTML(
            `
            <section id="projList">
                <select></select>
                <div class="status">${proj.statusStr}</div>
                ${this.#getAboutLinkUI()}
            </section>
            `
        );
        this.selectEl = this.el.querySelector("select");
        this.#fillProjListUI();
        this.selectEl.addEventListener("change", e => {
            let opt = this.selectEl.options[this.selectEl.selectedIndex].dataset;
            switch(opt.action) {
            case "load":    return App.setProject(() => this.switchProject(opt.id));
            case "new":     return App.setProject(() => this.#createNewProject(opt.key));
            case "rename":  return this.renameCurrentProject();
            case "delete":  return App.setProject(() => this.deleteCurrentProject());
            }
        });

        this.statusEl = this.el.querySelector(".status");
    }

    resetProjListUI() {
        if (!this.selectEl) {
            return;
        }
        this.selectEl.innerHTML = "";
        this.#fillProjListUI();
    }

    #fillProjListUI() {
        const projLI = this.selected;
        this.selectEl.appendHTML(
            `
            <optgroup label="Projects">
                ${this.projLIs.map(
                li => `<option data-action="load" data-id="${li.id}" ${li.id===projLI.id?"selected":""}>${li.name}</option>`
                ).join('\n')}
            </optgroup>
            <optgroup label="New Project From Template">
                ${Project.templates.map(
                li => `<option data-action="new" data-key="${li.key}">${li.name}</option>`
                ).join('\n')}
            </optgroup>
            <optgroup label="Project Actions">
                <option data-action="rename">Rename ${projLI.name}</option>
                <option data-action="delete">Delete ${projLI.name}</option>
            </optgroup>
            `
        );
    }

    #getAboutLinkUI() {
        const url = App.info?.repository?.url;
        if (!url) return "";
        return `<a href="${url}" target="_blank">About</a>`
    }
}
