import ExtricateItemBase from './base-item.mjs';

export default class ExtricateGear extends ExtricateItemBase {
  static LOCALIZATION_PREFIXES = [
    'EXTRICATE.Item.base',
    'EXTRICATE.Item.Gear',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 1,
    });
    schema.weight = new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      min: 0,
    });

    // Break down roll formula into three independent fields
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({
        ...requiredInteger,
        initial: 1,
        min: 1,
      }),
      diceSize: new fields.StringField({ initial: 'd20' }),
      diceBonus: new fields.StringField({
        initial: '+@str.mod+ceil(@lvl / 2)',
      }),
    });

    schema.formula = new fields.StringField({ blank: true });
	console.log("gear schema", this)
    return schema;
  }

  prepareDerivedData() {
    // Build the formula dynamically using string interpolation
    const roll = this.roll;
	console.log("gear prepared data", this)

    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
	console.log("this formula", this.formula)
  }
}
