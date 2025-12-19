import { ExtricateLewdMove } from '../data/_module.mjs';
import { prepareActiveEffectCategories } from '../helpers/effects.mjs';

const { api, sheets } = foundry.applications;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */

export class ExtricateActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2
) {
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
	this._selectChangeHandler = null //ai
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['extricate', 'actor'],
    position: {
      width: 600,
      height: 700,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
	  skillSelect: this._skillSelect,
    },
	window: {
		resizable: true
	},
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
  };

  /** @override */
  static PARTS = {
    header: {
		//path to the html template for this sheet
      template: 'systems/extricate/templates/actor/header.hbs',
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    features: {
      template: 'systems/extricate/templates/actor/features.hbs',
    },
    biography: {
      template: 'systems/extricate/templates/actor/biography.hbs',
    },
    gear: {
      template: 'systems/extricate/templates/actor/gear.hbs',
    },
    spells: {
      template: 'systems/extricate/templates/actor/spells.hbs',
    },
    effects: {
      template: 'systems/extricate/templates/actor/effects.hbs',
    },
	lewd: {
	  template: 'systems/extricate/templates/actor/lewd.hbs'
	}
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ['header', 'tabs'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) {
		options.parts.push('biography');
		return
	}
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'character':
        options.parts.push('features', 'lewd', 'gear', 'spells', 'biography', 'effects');
        break;
      case 'npc':
        options.parts.push('features', 'lewd', 'gear', 'spells', 'biography', 'effects');
        break;
    }




  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.EXTRICATE
      config: CONFIG.EXTRICATE,
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };

    // Offloading context prep to a helper function
    this._prepareItems(context);

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context) {
	console.log("context", context)
	console.log("partid", partId)
	
    switch (partId) {
      case 'features':
      case 'spells':
	  case 'lewd': 
      case 'gear':
        context.tab = context.tabs[partId];
        break;
      case 'biography':
        context.tab = context.tabs[partId];
        // Enrich biography info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedBiography = await TextEditor.enrichHTML(
          this.actor.system.biography,
          {
            // Whether to show secret blocks in the finished html
            secrets: this.document.isOwner,
            // Data to fill in for inline rolls
            rollData: this.actor.getRollData(),
            // Relative UUID resolution
            relativeTo: this.actor,
          }
        );
        break;
      case 'effects':
        context.tab = context.tabs[partId];
        // Prepare active effects
        context.effects = prepareActiveEffectCategories(
          // A generator that returns all effects stored on the actor
          // as well as any items
          this.actor.allApplicableEffects()
        );
        break;
    }
    return context;
  }


  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'features';
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'EXTRICATE.Actor.Tabs.',
      };
	  console.log(partId)
	  console.log("tabs", tabs)
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs;
        case 'features':
          tab.id = 'features';
          tab.label += 'Features';
          break;
        case 'gear':
          tab.id = 'gear';
          tab.label += 'Gear';
          break;
        case 'spells':
          tab.id = 'spells';
          tab.label += 'Spells';
          break;
		case 'biography':
		  tab.id = 'biography';
		  tab.label += 'Biography';
		  break;
        case 'effects':
          tab.id = 'effects';
          tab.label += 'Effects';
          break;
		case 'lewd':
		  tab.id = 'lewdtab'; //data-tab value
		  tab.label += 'Lewd';
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    // You can just use `this.document.itemTypes` instead
    // if you don't need to subdivide a given type like
    // this sheet does with spells
    const gear = [];
    const features = [];
	const LewdMove = []
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      // Append to gear.
      if (i.type === 'gear') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
	  // Refactor :standardize LewdMove variable name handling
	  else if (i.type === 'LewdMove') {
		LewdMove.push(i)
	  }
    }

    for (const s of Object.values(spells)) {
      s.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    // Sort then assign
    context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.features = features.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.spells = spells;
	context.LewdMove = LewdMove
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */

  _onRender(context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
    this.#disableOverrides();


	//Find out if foundry has something that handles all of this instead.
	//manually adds event listener upon opening sheet, that handles 
	//sending data to embedded items
	super._onRender?.(context, options)
	const html = this.element

	if(this._selectChangeHandler) html.removeEventListener('change', this._selectChangeHandler)
	
	this._selectChangeHandler = async (event) => {
		console.log("selectchange has triggered")
		const targetEl = event.target
		if ((targetEl instanceof HTMLInputElement) && targetEl.matches('input[data-item-id]')) {
			const itemId = targetEl?.dataset?.itemId
			const value = targetEl?.value
			try {
				console.log("item ID", itemId)
				console.log("Name", targetEl.name)
				await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, [targetEl.name]: value}])
			} catch (err) {
				console.error("failed to update embedded item", err)
			}
		}
		if (!(targetEl instanceof HTMLSelectElement) || !targetEl.matches('select[data-item-id]')) return

		const itemId = targetEl?.dataset?.itemId
		const value = targetEl?.value
		const skillNum = targetEl.name
		console.log('select change', itemId, value, skillNum)
		if (!itemId) return

		try {
			await this.actor.updateEmbeddedDocuments("Item", [{ _id: itemId, [skillNum]: value}])
		} catch (err) {
			console.error("failed to update embedded item", err)
		}
	}

	html.addEventListener('change', this._selectChangeHandler)

	//render skill buttons already selected
	//doesn't work

/* 	let selectedSkills = this.actor.system.selectedSkill

	if (selectedSkills.length < 1) {
		console.log("less than 1")
		console.log(selectedSkills)
		return
	} else if (selectedSkills.length === 1) {
		console.log("equals 1")
		console.log(selectedSkills)
		let skillLabel1Selector = "#" + selectedSkills[0].replace(".", "\\.")
		let skillLabel1 = this.element.querySelector(skillLabel1Selector)
		skillLabel1.classList.toggle('skill-btn-pressed')
	} else if (selectedSkills.length === 2) {
		console.log("equals 2")
		console.log(selectedSkills)
		let skillLabel1Selector = "#" + selectedSkills[0].replace(".", "\\.")
		let skillLabel2Selector = "#" + selectedSkills[1].replace(".", "\\.")
		let skillLabel1 = this.element.querySelector(skillLabel1Selector)
		let skillLabel2 = this.element.querySelector(skillLabel2Selector)
		skillLabel1.classList.toggle('skill-btn-pressed')
		skillLabel2.classList.toggle('skill-btn-pressed')
	} else {
		console.log("equals neither 1 or 2")
		console.log(selectedSkills)
		selectedSkills.length = 0
	}
 */
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  _onClose(options) {

  }


  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this ExtricateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this ExtricateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this ExtricateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this ExtricateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    // Retrieve the configured document class for Item or ActiveEffect
    const docCls = getDocumentClass(target.dataset.documentClass);
    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
		console.log("create doc target", target)
		console.log("Create doc Object", Object)
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(docData, dataKey, value);
    }


    // Finally, create the embedded document!
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this ExtricateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Handle clickable rolls.
   *
   * @this ExtricateActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;
	console.log("early dataset", dataset)

    // Handle item rolls.
    switch (dataset.rollType) {
      case 'item':
		console.log("The item case is activated")
        const item = this._getEmbeddedDocument(target);
		let test = target.closest('li[data-document-class]')
		console.log("this is test", test)
        if (item) return item.roll();
    }

    // Handle rolls that supply the formula directly.
	//the roll constructor needs the roll formula and some data object from which to 
	//retrieve any variable found in the roll formula
	//refactor this. change skillButtons to skills? 
	//then change skill1/2 to skills and use skills[0] and skills[1]

	//ROLL button
	switch (dataset.rollType) {
		case 'skill':
			let skills = this.actor.system.selectedSkill

			if (skills.length < 2) {
				ui.notifications.error("two skills must be selected")
				return
			}

			let skillLabel1Selector = "#" + skills[0].replace(".", "\\.")
			let skillLabel1 = this.element.querySelector(skillLabel1Selector)
			let skillLabel2Selector =  "#" + skills[1].replace(".", "\\.")
			let skillLabel2 = this.element.querySelector(skillLabel2Selector)
			let skillName1 = skillLabel1.getAttribute("data-label")
			let skillName2 = skillLabel2.getAttribute("data-label")
			let mod = "bonus"
			let label = `${skillName1} + ${skillName2}`
			
			let rollFormula = `1d20 + @${skills[0]}.value + @${skills[1]}.value + @${mod}.value`
			let roll = new Roll(rollFormula, this.actor.getRollData())

			await roll.toMessage({
				speaker: ChatMessage.getSpeaker({ actor: this.actor}),
				flavor: label,
				rollMode: game.settings.get('core', 'rollMode')
			})

			if (event.shiftKey === false) {

				skillLabel1.classList.toggle('active')
				skillLabel2.classList.toggle('active')
				skills.length = 0
			}

			return roll
	}

    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }

	
  }

  //should be called by html buttons in features.hbs associated with a skill.
  //determines which 2 buttons are pressed for calculating the skill roll.
  static async _skillSelect(event, target) {
	const skillButtons = this.actor.system.selectedSkill 
	const dataset = target.dataset
	let label = dataset.label
	let skillLabelElement = ''
	let unpressId = ''
	let unpressSelector = ''

	console.log(target)
	console.log(this.actor)


	if (target.id === skillButtons[0] || target.id === skillButtons[1]) {
		//unpress becomes the skill that is removed from skillButtons
		unpressId = (target.id === skillButtons[0]) ? skillButtons.shift():skillButtons.pop()
		//escape "." for querySelector
		//escape presumably no longer needed
		unpressSelector = "#" + unpressId.replace(".", "\\.")
		//find HTML element for this actor sheet
		skillLabelElement = this.element.querySelector(unpressSelector)
		skillLabelElement.classList.toggle('active')
	} else if (skillButtons.length < 2) { 
		skillButtons.push(target.id)
		target.classList.toggle('active')
	} else {
		target.classList.toggle('active')
		unpressId = skillButtons.shift()
		unpressSelector = "#" + unpressId.replace(".", "\\.")
		skillLabelElement = this.element.querySelector(unpressSelector)
		skillLabelElement.classList.toggle('active')
		skillButtons.push(target.id)
	}
  }


  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
	console.log("getembeddedlog", target)
    const docRow = target.closest('li[data-document-class]');
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }


  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const docRow = event.currentTarget.closest('li');
    if ('link' in event.target.dataset) return;

    // Chained operation
    let dragData = this._getEmbeddedDocument(docRow)?.toDragData();

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call('dropActorSheetData', actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case 'ActiveEffect':
        return this._onDropActiveEffect(event, data);
      case 'Actor':
        return this._onDropActor(event, data);
      case 'Item':
        return this._onDropItem(event, data);
      case 'Folder':
        return this._onDropFolder(event, data);
    }
  }

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid)
      return this._onSortItem(event, item);

    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments('Item', itemData);
  }

  /**
   * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
   * @param {Event} event
   * @param {Item} item
   * @private
   */
  _onSortItem(event, item) {
    // Get the drag source and drop target
    const items = this.actor.items;
    const dropTarget = event.target.closest('[data-item-id]');
    if (!dropTarget) return;
    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (item.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId;
      if (siblingId && siblingId !== item.id)
        siblings.push(items.get(el.dataset.itemId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(item, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.actor.updateEmbeddedDocuments('Item', updateData);
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop[]}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop(d);
    });
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
	console.log("this", this)
	console.log("event target", event.target.dataset.itemId)
	console.log("overrides", this.actor.overrides)
	console.log("Actual overrides result", overrides)
	console.log("event", event)
	console.log("Form", form)
	console.log("submitData", submitData)
    for (let k of Object.keys(overrides)) {
		console.log("there's no keys?", k)
		delete submitData[k]

	}
	console.log("overrides", this.actor.overrides)
    await this.document.update(submitData);
  }


  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
	console.log("flat overrides", flatOverrides)
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }
}
