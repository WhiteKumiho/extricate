/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ExtricateItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll(event) {
    const item = this;
	console.log("item.mjs this", this)

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;
	let label2 = ''

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
		let test = this.getRollData()
		console.log("rolldata", test)
		console.log("this from item.mjs", this.actor)
      ChatMessage.create({
        speaker: speaker,
        rollMode: "roll mode:" + rollMode,
        flavor: "Label" + label,
        content: item.system.description ?? '',
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.formula, rollData.actor);
      // If you need to store the value first, uncomment the next line.
      // const result = await roll.evaluate();
	  if (this.system.skillRoll.skill1 && this.system.skillRoll.skill2) {
		label2 = `: ${this.system.skillRoll.skill1}+${this.system.skillRoll.skill2}`
	  }
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label + label2,
      });
      return roll;
    }
  }
}
