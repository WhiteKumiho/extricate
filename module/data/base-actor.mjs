export default class ExtricateActorBase extends foundry.abstract
  .TypeDataModel {
  static LOCALIZATION_PREFIXES = ["EXTRICATE.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.health = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 10,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 }),
    });
	schema.barrier = new fields.SchemaField({
	  value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0}),
	  max: new fields.NumberField({ ...requiredInteger, initial: 5 }),
	})
	schema.lewd = new fields.SchemaField({
		value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0}),
		max: new fields.NumberField({ ...requiredInteger, initial: 20, min: 0})
	})
	schema.bonus = new fields.SchemaField({
		value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0})
	})
/*     schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5 }),
    }); */
    schema.biography = new fields.HTMLField();

    return schema;
  }
}
