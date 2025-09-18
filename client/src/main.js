const canvas = document.getElementById("game-canvas");
const engine = new BABYLON.Engine(canvas, true, {
    stencil: true }, true);

const enemies   = [];
const players   = [];
const itemTypes = {
    "rifle": {model: "rifle.obj", gun: true, damage: 2, texture: true},
    "tool":  {model: "tool.obj", gun: false, damage: 1, texture: true},
    "gauntlet": {model: "gauntlet.glb", gun: false, damage: 3, texture: false}
};

function cursorShow(ui, scene){
    // Курсор
    const cursor = new BABYLON.GUI.Image("cursor", "./public/cursor.png");
    cursor.width = "64px";
    cursor.height = "64px";
    cursor.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    cursor.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    ui.addControl(cursor);

    // Параметры покачивания
    const amplitude = 5; // пиксели
    const frequency = 2; // колебаний в секунду
    let time = 0;

    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        time += deltaTime;

        // Синусоидальное смещение
        cursor.left = Math.sin(time * frequency * 2 * Math.PI) * amplitude;
        cursor.top = Math.cos(time * frequency * 2 * Math.PI) * amplitude;
    });
}

async function createEnvironment(scene, shadowGenerator){

    const steelpipes = new AlphaSprite(scene, ["./public/sprites/steelpipes171x88.png"], 
    {
        position: new BABYLON.Vector3(-72, 3, 7),
        size: 4.5,
        alpha: 1,
        rotation: new BABYLON.Vector3(0, Math.PI/2, 0)
    });
    const steelpipes2 = new AlphaSprite(scene, ["./public/sprites/steelpipes171x88.png"], 
    {
        position: new BABYLON.Vector3(-72, 3, 12),
        size: 4.5,
        alpha: 1,
        rotation: new BABYLON.Vector3(0, Math.PI/2, 0)
    });

    const hand = new AlphaSprite(scene, ["./public/sprites/handmin.png"], 
    {
        position: new BABYLON.Vector3(-72.7, 3, 12),
        size: 3,
        alpha: 1,
        rotation: new BABYLON.Vector3(0, -Math.PI/2, Math.PI/2)
    });
    const hand2 = new AlphaSprite(scene, ["./public/sprites/handmin.png"], 
    {
        position: new BABYLON.Vector3(-72.7, 3, 7.5),
        size: 3,
        alpha: 1,
        rotation: new BABYLON.Vector3(0, -Math.PI/2, Math.PI/2)
    });

    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
        width: 1000,
        height: 1000
    }, scene);

    ground.checkCollisions = true;
    ground.receiveShadows = true;

    const groundMat = new BABYLON.StandardMaterial("groundMaterial", scene);
    const groundTexture = new BABYLON.Texture("./public/image.png", scene);
    groundTexture.uScale = 100;
    groundTexture.vScale = 100;
    groundMat.diffuseTexture = groundTexture;
    groundTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    groundTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    ground.material = groundMat;

    const meshes ={};

    const shop = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "./public/models/city/",
        "house.glb", scene
    );
    shop.meshes[0].checkCollisions = true;
    shop.meshes[0].scaling = new BABYLON.Vector3(3.7, 3.7, 3.7);
    shop.meshes[0].position = new BABYLON.Vector3(-75, 0, 10);
    shop.meshes[0].rotation = new BABYLON.Vector3(0, 0, 0);
    const collider = BABYLON.MeshBuilder.CreateBox("collider", 
        {width:12, height:15, depth:14}, scene);
    collider.position = shop.meshes[0].position.clone();
    collider.position.z -= 2;
    collider.isVisible = false;
    collider.checkCollisions = true;

    const angel = await BABYLON.SceneLoader.ImportMeshAsync(
        "",
        "./public/models/city/",
        "angel.glb", scene
    );
    angel.meshes[0].checkCollisions = true;
    angel.meshes[0].scaling = new BABYLON.Vector3(5, 5, 5);
    angel.meshes[0].position = new BABYLON.Vector3(-100, 0, 200);
    angel.meshes[0].rotation = new BABYLON.Vector3(0, Math.PI/4, 0);
}

function spawnItem(type, position, scale, scene, shadowGenerator) {
    const props = itemTypes[type];
    BABYLON.SceneLoader.ImportMeshAsync("", "./public/models/items/", props.model, scene)
        .then(result => {
            const mesh = result.meshes[0];
            mesh.position = position.clone();
            mesh.isPickable = true;
            mesh.itemProps = props; // сохраняем свойства прямо в меш
            mesh.scaling = new BABYLON.Vector3(scale, scale, scale);
            mesh.checkCollisions = true;
            shadowGenerator.addShadowCaster(mesh);
            if(props.texture){
                const material = new BABYLON.StandardMaterial(
                    type + "_mat", scene);
                const tex = new BABYLON.Texture(
                    "./public/models/items/" + type + ".png", scene);
                material.backFaceCulling = false;
                material.diffuseTexture = tex;
                mesh.material = material; 
            }
        });
}

async function createItems(scene, shadowGenerator){
    spawnItem("rifle", new BABYLON.Vector3(5, 3, 5), 1, scene, shadowGenerator);
    spawnItem("tool", new BABYLON.Vector3(-5, 3, 5), 0.1, scene, shadowGenerator);
    spawnItem("gauntlet", new BABYLON.Vector3(-5, 3, -5), 1, scene, shadowGenerator);
}


const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    scene.collisionsEnabled = true;
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    const player = new Player(scene, canvas, ui);
    players.push(player);
    player.CreateController({
        x: 1, y: 5, z: 1
    }, engine.getRenderHeight(), engine.getRenderWidth());
    player.createHealthUI();
    const fps = 60;
    const gravity = -9.81;
    scene.gravity = new BABYLON.Vector3(0, gravity / fps, 0);
    
    //enemies.push(new Enemy(scene, new BABYLON.Vector3(-10, 3, -10), "ophanim_angel.glb"));
    enemies.push(new Enemy(scene, new BABYLON.Vector3(30, 1, -30), "angel.glb", 15, 0));

    
    const sun = new BABYLON.DirectionalLight("sun", 
        new BABYLON.Vector3(-1, -2, -1), scene);1
    sun.intensity = 1.2;
    sun.position = new BABYLON.Vector3(50, 100, 50);
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, sun);
    cursorShow(ui, scene);  
    createEnvironment(scene, shadowGenerator);
    createItems(scene, shadowGenerator);

    enemies.forEach(enemy => {
        shadowGenerator.addShadowCaster(enemy.mesh);
    });


    scene.onPointerDown = (evt) => {
        if (evt.button === 0)  scene.getEngine().enterPointerlock();
        if (evt.button === 1)  scene.getEngine().exitPointerlock();
    };
    scene.onBeforeRenderObservable.add(() => {
        enemies.forEach(enemy => enemy.update(players));
    });

    return scene;
};

const scene = createScene();
engine.runRenderLoop(()=> {
    scene.render()
});



window.addEventListener("resize", () => {
    this.engine.resize();
});

canvas.addEventListener("click", () => {
    if (canvas.requestPointerLock) {
        canvas.requestPointerLock();
    } else if (canvas.msRequestPointerLock) {
        canvas.msRequestPointerLock();
    } else if (canvas.mozRequestPointerLock) {
        canvas.mozRequestPointerLock();
    } else if (canvas.webkitRequestPointerLock) {
        canvas.webkitRequestPointerLock();
    }
});
