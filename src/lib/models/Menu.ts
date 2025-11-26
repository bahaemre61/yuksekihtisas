import mongoose, {Document, Schema, models, model} from 'mongoose';

export interface IMenu extends Document{
    date: Date;
    items: string[];
    calories? : number;
}

const MenuSchema : Schema<IMenu> = new Schema({
    date:{
        type : Date,
        required : true,
        unique : true
    },
    items: {
        type : [String],
        required: true
    },
    calories : {
        type : Number
    }   
}, {
    timestamps : true
});

const Menu = models.Menu || model<IMenu>('Menu', MenuSchema);

export default Menu;