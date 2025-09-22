const itemTypes = {
    "rifle": 
    {
        model: "rifle.glb", gun: true, damage: 2, 
        texture: false,
    },
    "tool":  
    {
        model: "toolCHECK.glb", gun: false, damage: 1, 
        texture: false, scale: 1,
        attach:{
            right: 0.7,
            left: -0.7,
            y: -2.5,
            z: 2.5,
            rotation: new BABYLON.Vector3(-Math.PI/2,0,0,) 
        }
    },
    "gauntlet": 
    {
        model: "gauntlet.glb", gun: false, 
        damage: 3, texture: false
    },
    "ciggs": 
    {
        model: "ciggs.glb", gun: false, 
        damage: 0, texture: false, heal: 1, scale: 0.5,
        attach:{
            right: 0.7,
            left: -0.7,
            y: -2.5,
            z: 2.5,
            rotation: new BABYLON.Vector3(0,0,0,) 
        }
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
        this.uiText = null;
        this.camAttach;
        this.realItemMesh = null;

        if (this.type === "ciggs" ?? itemTypes[this.type]) {
            this.healAmount = itemTypes[this.type].heal;       // Количество лечения
            this.amount = 3;              // Количество использований
        }
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
            

            const mesh = result.meshes[0]; //__root__
            mesh.position = this.position.clone();
            mesh.itemProps = props;
            mesh.scaling = new BABYLON.Vector3(this.scale, this.scale, this.scale);

            // ССЫЛКИ
            this.model = mesh;
            this.realItemMesh = result.meshes.find(m => m !== mesh && m.getTotalVertices() > 0) || mesh; // главный видимый
            mesh.itemInstance = this;
            console.log("Предмет создан:", this.type, "корень:", mesh.name, "реальный меш:", this.realItemMesh.name);

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
        
            if(itemTypes[this.type].heal){
                this.createItemUI();
            }
            return mesh;
    }

    use(player){
        console.log(`⚡ Используем предмет: ${this.type}`);
        
        

        switch (this.type){
            case 'rifle':
                this.useGUN(); //урон, дальность
                break;
            case 'tool':
                this.useSWORD();
                break;
            case 'ciggs':
                if (this.amount > 0) {
                    player.heal(itemTypes[this.type].heal);
                    this.amount--;
                    this.updateUIText();
                }
                if (this.amount <= 0) {
                    this.destroy();
                }
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

    createItemUI() {
        if (this.type !== "ciggs") return;
        // плоскость для UI (маленькая, привязана к модели)
        this.uiPlane = BABYLON.MeshBuilder.CreatePlane(`${this.model.name}_ui`, { width: 3, height: 3 }, this.scene);
        this.uiPlane.parent = this.realItemMesh; // привязать к мешу
        this.uiPlane.position = new BABYLON.Vector3(1, 1, 0);
        this.uiPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // всегда к камере

        // GUI для плоскости — удобнее, чем рисовать ручной DynamicTexture
        this.adt = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.uiPlane);
        this.uiText = new BABYLON.GUI.TextBlock();
        this.uiText.text = String(this.amount);
        this.uiText.fontSize = 150;
        this.uiText.color = "white";
        this.uiText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.uiText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.adt.addControl(this.uiText);
    }

    setUIPosition(mode) {
        if (!this.uiPlane) return;
        if (mode === "hand") {
            this.uiPlane.position = new BABYLON.Vector3(0, 1, 2);
            this.uiPlane.scaling = new BABYLON.Vector3(1, 1, 1);
            this.uiPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
        } else {
            this.uiPlane.position = new BABYLON.Vector3(0, 0.4, 0.2);
            this.uiPlane.scaling = BABYLON.Vector3.One();
            this.uiPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        }
    }

    updateUIText() {
        if (this.uiText) {
        this.uiText.text = String(this.amount);
        }
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