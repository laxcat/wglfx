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
        nextProjectId:      undefined,
        selectedIndex:      undefined,
        projLIs:            [ProjListItem],
        projectTemplates:   [ProjListItem],
    }

    // default construction of ProjectList when none found on dist
    static templates = [
        {
            nextProjectId: 1,
            selectedIndex: 0,
            projLIs: [],
            projectTemplates: Project.templates,
        }
    ];

    get selected() {
        return (this.selectedIndex < this.projLIs.length) ?
            this.projLIs[this.selectedIndex] :
            null;
    }

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
            // falsy passed in, use selected
            (!listItemOrId ? this.selected?.id : null) ??
            // listItem.id
            ProjListItem.orNull(listItemOrId)?.id ??
            // id was passed in, find the list item
            this.projLIs.find(li => (li.id === listItemOrId))?.id ??
            0
        );
        let proj = null;
        if (id) {
            const serialObj = Project.load(id);
            if (serialObj) {
                proj = new Project(serialObj);
            }
        }
        if (!proj) {
            proj = new Project({
                id: this.nextProjectId++,
                name: "Brand New Project"
            });
            this.addEntry(proj.id, proj.name, true);
        }
        return proj; // Project
    }

    save() {
        const serialObj = this.serialize();
        localStorage.setItem(App.KEY_PROJ_LIST, JSON.stringify(serialObj));
        console.log("???", serialObj);
        return serialObj;
    }

    addEntry(id, name, selected) {
        this.projLIs.push(
            new ProjListItem({id, name})
        );
        if (selected) {
            this.selectedIndex = this.projLIs.length - 1;
        }
    }

    createUI(parentEl) {
        // add pass ui
        const listEl = parentEl.appendHTML(
            `
            <section id="projList">
                <label>${this.selected.name}</label>
            </section>
            `

        );
    }
}
