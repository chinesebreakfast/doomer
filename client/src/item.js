const itemTypes = {
    "rifle": 
    {
        model: "rifle.glb", gun: true, damage: 2, 
        texture: false
    },
    "tool":  
    {
        model: "toolCHECK.glb", gun: false, damage: 1, 
        texture: false, scale: 1
    },
    "gauntlet": 
    {
        model: "gauntlet.glb", gun: false, 
        damage: 3, texture: false
    }
};

class Item{

    type = null;

    constructor(scene, options = {}){
        this.type = options.type;
        this.scale = options.scale;
        this.position = options.position;
        this.scene = scene;
        this.animations = [];
        this.model;
        this.slotIndex = 1;
    }

    async spawnItem() {
            const props = itemTypes[this.type];

            // Ждём загрузки модели
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "", 
                "./public/models/items/", 
                props.model, 
                this.scene
            );
            

            const mesh = result.meshes[0];
            mesh.position = this.position.clone();
            mesh.itemProps = props;
            mesh.scaling = new BABYLON.Vector3(this.scale, this.scale, this.scale);

            // ССЫЛКИ
            this.model = mesh;
            mesh.itemInstance = this;
            console.log("Предмет создан:", this.type, "коллизии:", mesh.checkCollisions);

            //Добавляем текстуру, если указано
            if (props.texture) {
                const material = new BABYLON.StandardMaterial(this.type + "_mat", this.scene);
                const tex = new BABYLON.Texture("./public/items/" + this.type + ".png", this.scene);
                material.backFaceCulling = false;
                material.diffuseTexture = tex;
                mesh.material = material;
            }

            result.meshes.forEach(m => {
                m.checkCollisions = true;
                m.isPickable = true;
            });

            // Останавливаем все анимации, если они есть
            if (result.animationGroups && result.animationGroups.length > 0) {
                this.animations = result.animationGroups;
                this.animations.forEach(a => a.stop());
            }
            return mesh;
    }

    use(){
        console.log(`⚡ Используем предмет: ${this.type}`);
        //if(!itemTypes[this.type]) return;
        

        switch (this.type){
            case 'rifle':
                this.useGUN(); //урон, дальность
                break;
            case 'tool':
                this.useSWORD();
        }

    }

    useGUN(){
        this.playAnimation("Shot");
        console.log("GUNN");
    }

    useSWORD(){
        if(this.slotIndex == 1) this.playAnimation("Shot_Right");
        else this.playAnimation("Shot_left");

        console.log("TOOL");
    }

    playAnimation(animationName) {
        if (!this.animations || this.animations.length === 0) {
            console.log(`🎬 Нет анимаций для ${this.type}`);
            return;
        }

        const animation = this.animations.find(anim => anim.name === animationName);
        if (animation) {
            animation.stop();
            animation.play(false); // false = не зацикливать
            console.log(`🎬 Проигрываем анимацию: ${animationName}`);
        } else {
            console.log(`❌ Анимация ${animationName} не найдена`);
        }
    }
}