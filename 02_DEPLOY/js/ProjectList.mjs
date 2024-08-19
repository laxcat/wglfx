import App from "./App.mjs"
import Project from "./Project.mjs"
import Serializable from "./Serializable.mjs"
import * as ui from "./util-ui.mjs"

/*
    A list of projects, and operations to manage projects.
*/

class ProjListItem extends Serializable {
    static serialProps = {
        id: undefined,
        name: undefined,
    }
}

export default class ProjectList extends Serializable {
    static serialProps = {
        nextProjectId:  undefined,
        selectedId:     undefined,
        projLIs:        [ProjListItem],
    }

    // default construction of ProjectList when none found on dist
    static templates = [
        {
            nextProjectId: 1,
            selectedId: undefined,
            projLIs: [],
        }
    ];

    static newProjectName = "My Project";

    get selected() { return this.itemForId(this.selectedId); }

    get projectCount() { return this.projLIs.length; }

    load() {
        // load from disk
        const loaded = localStorage.getItem(App.KEY_PROJ_LIST);
        if (loaded) {
            this.deserialize(JSON.parse(loaded));
        }
        return this.selected; // ProjListItem (not Project!)
    }

    createProject(listItemOrId) {
        const id = (
            // falsy passed in, use selectedId
            ((!listItemOrId && this.selectedId) ? this.selectedId : null) ??
            // listItem.id
            ProjListItem.orNull(listItemOrId)?.id ??
            // id was passed in, find the list item
            this.itemForId(listItemOrId)?.id ??
            0
        );

        let proj = null;

        // a specific id was requested
        if (id) {
            try {
                const serialObj = Project.load(id, this.itemForId(id)?.name);
                if (serialObj) {
                    proj = new Project(serialObj);
                }
            } catch(e) {};
            // if loading the project errored out, we should remove it from the list
            if (!proj) {
                this.removeItem(id);
                if (id === this.selectedId) {
                    this.findNewSelected();
                }
                return this.createProject(this.selectedId);
            }
        }

        // no project loaded, create default
        if (!proj) {
            proj = new Project({
                id: this.nextProjectId++,
                name: ProjectList.newProjectName,
            });
            this.addItem(proj.id, proj.name, true);
        }
        return proj; // Project
    }

    save() {
        const serialObj = this.serialize();
        localStorage.setItem(App.KEY_PROJ_LIST, JSON.stringify(serialObj));
        console.log("???", serialObj);
        return serialObj;
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

    createUI(parentEl) {
        // add pass ui
        const listEl = parentEl.appendHTML(
            `
            <section id="projList">
                <label>${this.selected.name}</label>
                <select>
                <optgroup label="Projects">
                    ${this.#getOptionListUI(this.projLIs)}
                </optgroup>
                <optgroup label="New Project From Template">
                    ${this.#getOptionListUI(Project.templates)}
                </optgroup>
                ${this.#getActionOptionListUI(this.selected)}
                </select>
            </section>
            `
        );
    }

    #getOptionListUI(projLIs) {
        return projLIs.map(
            li => `<option value="${li.id||li.key}">${li.name}</option>`
        ).join('\n');
    }

    #getActionOptionListUI(projLI) {
        return "";
        // if (!projLI) return "";

        // return projLIs.map(
        //     li => `<option value="${li.id||li.key}">${li.name}</option>`
        // ).join('\n');
    }
}
