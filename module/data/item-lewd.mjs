import ExtricateItemBase from './base-item.mjs'

export default class ExtricateLewdMove extends ExtricateItemBase {
  static LOCALIZATION_PREFIXES = [
	'EXTRICATE.Item.base',
	'EXTRICATE.Item.Lewd',
  ]

  static defineSchema() {
	const fields = foundry.data.fields
	const requiredInteger = { required: true, nullable: false, integer: true }
	const schema = super.defineSchema()
	const skillSets = CONFIG.EXTRICATE.skills
	let skills = {}
	
	//get each skill category
	//this puts skill name objects in the skills variable.
	for (let [key, value] of Object.entries(skillSets)) {
		for (let [skill, localize] of Object.entries(value)) {
			console.log("skill", skill)
			console.log("localize", localize)
			skills[skill] = localize
			console.log(skills)
		}
	}

	/* 	if (skillSets) {
			for (let [key, value] of Object.entries(skillObject)) {
				data[key] = foundry.utils.deepClone(value)
	} */

	//prepare value for first skill option

	//dont need dice size, dont need number of dice
	//d20 exploding?
	//skill1 dropdown options field
	//skill2 dropdown options field
	//bonus modifier

	//<div class="form-group">
	//<label>{{localize "EXTRICATE.Actor.Character.Attribute.Key"}}</label>
	//<select name="system.ability.value" {{disabled (not isAttributeConfigurable)}}>
	//	{{selectOptions attributes selected=selectedAttribute localize=true}}
	//</select>

	//ap cost
	//penetration
	//range
	//Element
	//Special effect
	// lewdmove.system.formula = 1d20 explode + skill1 + skill2 + bonus
/* 	"rollFormula": {"label": "Roll Formula"},
	"skill1": {"label": "Skill 1"},
	"skill2": {"label": "Skill 2"},
	"bonus": {"label": "misc. bonus"},
	"effect": {"label": "Effect"},
	"description": {"label": "Description"} */

	schema.effect = new fields.StringField ({ initial: 'effect'})
	console.log("ooooooooooooooooooooo",skills)

 	schema.validSkills = new fields.SchemaField(
		Object.keys(skills).reduce((obj, skill) => {
			console.log("skill check", skill)
			console.log("obj check", obj)
			//skill is the key, it is the string name of the skill
			//skills needs to have the skill name as the keys
			//skill needs to be the string name of the skill

			//this just makes a list of objects with keys = to skillnames
			//and gives them labels
			obj[skill] = new fields.SchemaField({
				label: new fields.StringField({
					initial: skill,
				}),
			})
			return obj
		}, {})
		
	)

	schema.skillRoll = new fields.SchemaField({
		//1d20x is exploding dice
		dice: new fields.StringField({ initial: "1d20" }),
		skill1: new fields.StringField({ initial: "melee" }),
		skill2: new fields.StringField({ initial: "melee" }),
		bonus: new fields.NumberField({
		  ...requiredInteger,
		  initial: 0,
		  min: 0,
		}),
	})



	schema.skillFormula = new fields.StringField({ blank: true })

	schema.damageRoll = new fields.SchemaField({
		diceNum: new fields.NumberField({
		  ...requiredInteger,
		  initial: 1,
		  min: 1,
		}),
		diceSize: new fields.StringField({ initial: 'd8' }),
		diceBonus: new fields.StringField({
		  initial: '0',
		}),
	}, {})	

	schema.damageFormula = new fields.StringField({ blank: true })
	console.log("lewd schema", this)
	

	return schema
  }


  prepareDerivedData() {
	const skillRoll = this.skillRoll
	const damageRoll = this.damageRoll
	console.log("prepare lewd schema", this)


	this.formula = 
	`${skillRoll.dice}+@${skillRoll.skill1}.value+@${skillRoll.skill2}.value+${skillRoll.bonus}`

	this.damageFormula = `
	${damageRoll.diceNum}${damageRoll.diceSize}${damageRoll.diceBonus}`
  }
}