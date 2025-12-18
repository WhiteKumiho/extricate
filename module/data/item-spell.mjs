import ExtricateItemBase from './base-item.mjs';

export default class ExtricateSpell extends ExtricateItemBase {
  static LOCALIZATION_PREFIXES = [
    'EXTRICATE.Item.base',
    'EXTRICATE.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 0,
      min: 0,
      max: 9,
    });

    return schema;
  }
}
