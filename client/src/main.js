const canvas = document.getElementById("game-canvas");
const engine = new BABYLON.Engine(canvas, true, {
    stencil: true }, true);

const enemies   = [];
const players   = [];

const initSky = (scene) => {
    console.log("Инициализируем небо и освещение...");
    
    try {
        // Сначала освещение
        const lights = setupLight(scene);
        
        // Затем небо
        const skybox = createSkyboxFromSingleTexture(scene);
        
        console.log("Небо и освещение успешно созданы!");
        return { skybox, lights };
    } catch (error) {
        console.error("Ошибка при создании неба:", error);
        // Fallback: простое цветное небо
        scene.clearColor = new BABYLON.Color4(0.1, 0.05, 0.15, 1.0);
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        return { skybox: null, lights: light };
    }
};

const createSkyboxFromSingleTexture = (scene) => {
    console.log("Создаем небо из панорамной текстуры...");
    
    // Создаем сферу для неба
    const skySphere = BABYLON.Mesh.CreateSphere("skySphere", 32, 1000, scene);
    skySphere.infiniteDistance = true;
    
    // Создаем материал для неба
    const skyMaterial = new BABYLON.StandardMaterial("skyMaterial", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.disableLighting = true; // Важно: отключаем освещение для неба
    
    // Загружаем вашу панорамную текстуру
    const panoramaTexture = new BABYLON.Texture("./public/sky/2.png", scene);
    
    // Настройка текстуры для панорамного отображения
    skyMaterial.diffuseTexture = panoramaTexture;
    skyMaterial.diffuseTexture.coordinatesMode = BABYLON.Texture.FIXED_EQUIRECTANGULAR_MODE;
    skyMaterial.diffuseTexture.wAng = Math.PI; // Поворот на 180 градусов если нужно
    
    // Делаем текстуру emissive (светящейся) чтобы небо было ярким
    skyMaterial.emissiveTexture = panoramaTexture;
    skyMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    
    // Отключаем все эффекты которые могут мешать
    skyMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyMaterial.alpha = 1;
    
    skySphere.material = skyMaterial;
    
    console.log("Небо создано, текстура:", "./public/sky/2.png");
    return skySphere;
};

const setupLight = (scene) => {
    console.log("Настраиваем освещение...");
    
    // Темный фон для контраста с небом
    scene.clearColor = new BABYLON.Color4(0.05, 0.02, 0.08, 1.0);
    
    // Мягкое окружающее освещение
    const ambientLight = new BABYLON.HemisphericLight(
        "ambientLight", 
        new BABYLON.Vector3(0, 1, 0), 
        scene
    );
    ambientLight.intensity = 0.4;
    ambientLight.diffuse = new BABYLON.Color3(0.3, 0.2, 0.4);
    ambientLight.groundColor = new BABYLON.Color3(0.1, 0.15, 0.2);
    
    // Основной направленный свет
    const mainLight = new BABYLON.DirectionalLight(
        "mainLight", 
        new BABYLON.Vector3(-0.5, -1, -0.3), 
        scene
    );
    mainLight.intensity = 0.7;
    mainLight.diffuse = new BABYLON.Color3(0.8, 0.7, 0.6);
    mainLight.position = new BABYLON.Vector3(30, 50, 30);

    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; // Плавный туман
    scene.fogDensity = 0.002; // Плотность тумана (можно настроить)
    scene.fogColor = new BABYLON.Color3(0.1, 0.3, 0.1); // ЗЕЛЕНЫЙ цвет тумана
    
    return { ambientLight, mainLight };
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

async function createItems(scene){
    //RIFLE
    const rifle = new Item(scene, {
        type: "rifle", 
        position: new BABYLON.Vector3(10, 2, 5),
        scale: 1
    });    
    try {
        const riflemesh = await rifle.spawnItem();
    } catch (error) {
        console.error("Ошибка создания предмета:", error);
    }
    //TOOL
    const tool = new Item(scene, {
        type: "tool", 
        position: new BABYLON.Vector3(30, 2, 5),
        scale: 1
    });
    try {
        const toolmesh = await tool.spawnItem();
    } catch (error) {
        console.error("Ошибка создания предмета:", error);
    }
    //CIGGS
    const ciggs = new Item(scene, {
        type: "ciggs", 
        position: new BABYLON.Vector3(10, 2, 15),
        scale: 1
    });
    try {
        const ciggsmesh = await ciggs.spawnItem();
    } catch (error) {
        console.error("Ошибка создания предмета:", error);
    }
}


const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    ui.rootContainer.isPointerBlocker = false;
    scene.preventDefaultOnPointerDown = false;
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    initSky(scene);
    const player = new Player(scene, canvas, ui);
    players.push(player);
    player.CreateController({
        x: 1, y: 5, z: 1
    }, engine.getRenderHeight(), engine.getRenderWidth());
    player.createUI();
    window.player = player;
    const fps = 60;
    const gravity = -9.81;
    scene.gravity = new BABYLON.Vector3(0, gravity / fps, 0);
    scene.collisionsEnabled = true;

    //enemies.push(new Enemy(scene, new BABYLON.Vector3(-10, 3, -10), "ophanim_angel.glb"));
    //enemies.push(new Enemy(scene, new BABYLON.Vector3(30, 1, -30), "angel.glb", 15, 0));

    
    cursorShow(ui, scene);  
    createEnvironment(scene);
    createItems(scene);


    scene.onPointerDown = (evt) => {
        if (evt.button === 0)  scene.getEngine().enterPointerlock();
        if (evt.button === 1)  scene.getEngine().exitPointerlock();
    };
    scene.onBeforeRenderObservable.add(() => {
        enemies.forEach(enemy => enemy.update(players));
    });

    return scene;
};



// Инициализация всей сцены


const scene = createScene();
engine.runRenderLoop(()=> {
    scene.render()
});

window.addEventListener("resize", () => {
    engine.resize();
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
