const canvas = document.getElementById("game-canvas");
const engine = new BABYLON.Engine(canvas, true, {
    stencil: true }, true);

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

async function createEnvironment(scene){

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
        "./public/models/terminal/",
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
}

async function createItems(scene){
    BABYLON.SceneLoader.ImportMeshAsync("", "./public/models/tool/", "tool.obj", scene).then(result => {
        const weaponMesh = result.meshes[0];
        console.log("HEYY");
        const rifleTex = new BABYLON.Texture("./public/models/tool/tool.jpg", scene);
        weaponMesh.material = new BABYLON.StandardMaterial("rifleMat", scene);
        weaponMesh.material.diffuseTexture = rifleTex;

        weaponMesh.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);

        // Размещаем на полу
        weaponMesh.position = new BABYLON.Vector3(3, 2, 5);
        weaponMesh.rotation = new BABYLON.Vector3(0, 0, Math.PI/2);
        weaponMesh.isPickable = true;
        weaponMesh.checkCollisions = true;
    });
    
    //загрузка предмета
    BABYLON.SceneLoader.ImportMeshAsync("", "./public/models/rifle/", "1.obj", scene).then(result => {
        const weaponMesh = result.meshes[0];
        
        const rifleTex = new BABYLON.Texture("./public/models/rifle/1.png", scene);
        weaponMesh.material = new BABYLON.StandardMaterial("rifleMat", scene);
        weaponMesh.material.diffuseTexture = rifleTex;

        weaponMesh.scaling = new BABYLON.Vector3(1, 1, 1);

        // Размещаем на полу
        weaponMesh.position = new BABYLON.Vector3(5, 2, 5);
        weaponMesh.isPickable = true;
        weaponMesh.checkCollisions = true;
    });
}


const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    scene.collisionsEnabled = true;
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    const player = new Player(scene, canvas, ui);
    player.CreateController({
        x: 1, y: 5, z: 1
    });
    player.createHealthUI();
    const fps = 60;
    const gravity = -9.81;
    scene.gravity = new BABYLON.Vector3(0, gravity / fps, 0);
    
    
    const light = new BABYLON.HemisphericLight("light", 
        new BABYLON.Vector3(0, 50, 0), 
        scene);
    // Dim the light a small amount 0 - 1
    light.intensity = 1;
    cursorShow(ui, scene);  
    createEnvironment(scene);
    createItems(scene);
      


    scene.onPointerDown = (evt) => {
        if (evt.button === 0)  scene.getEngine().enterPointerlock();
        if (evt.button === 1)  scene.getEngine().exitPointerlock();
    };


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
