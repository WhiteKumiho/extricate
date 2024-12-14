import ExtricateActorBase from './base-actor.mjs';

export default class ExtricateCharacter extends ExtricateActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'EXTRICATE.Actor.Character',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.EXTRICATE.abilities).reduce((obj, ability) => {
		console.log(ability)
        obj[ability] = new fields.SchemaField({
          value: new fields.NumberField({
            ...requiredInteger,
            initial: 15,
            min: 0,
          }),
        });
        return obj;
      }, {})
    );

	schema.metSkills = new fields.SchemaField( 
	  Object.keys(CONFIG.EXTRICATE.skills.mettle).reduce((obj, skill) => {
		obj[skill] = new fields.SchemaField({
		  value: new fields.NumberField({
			...requiredInteger,
			initial: 1,
			min: 0,
		  }),
		});
		return obj;
	  }, {})
	);
	
	schema.agiSkills = new fields.SchemaField( 
		Object.keys(CONFIG.EXTRICATE.skills.agility).reduce((obj, skill) => {
		  obj[skill] = new fields.SchemaField({
			value: new fields.NumberField({
			  ...requiredInteger,
			  initial: 0,
			  min: 0,
			}),
		  });
		  return obj;
		}, {})
	  );
	
	schema.intSkills = new fields.SchemaField( 
		Object.keys(CONFIG.EXTRICATE.skills.intellect).reduce((obj, skill) => {
		  obj[skill] = new fields.SchemaField({
			value: new fields.NumberField({
			  ...requiredInteger,
			  initial: 0,
			  min: 0,
			}),
		  });
		  return obj;
		}, {})
	  );  
	
	schema.witSkills = new fields.SchemaField( 
		Object.keys(CONFIG.EXTRICATE.skills.wit).reduce((obj, skill) => {
		  obj[skill] = new fields.SchemaField({
			value: new fields.NumberField({
			  ...requiredInteger,
			  initial: 0,
			  min: 0,
			}),
		  });
		  return obj;
		}, {})
	  );    

    return schema;
  }

  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // this points to ExtricateCharacter
      // Calculate the modifier using d20 rules.
      this.abilities[key].mod = Math.floor(
        (this.abilities[key].value - 10) / 2
      );
      // Handle ability label localization.
      this.abilities[key].label =
        game.i18n.localize(CONFIG.EXTRICATE.abilities[key]) ?? key;
    }
  }

  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.abilities) {
      for (let [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data;
  }


}
