const canvas = document.getElementById("game-canvas");
const engine = new BABYLON.Engine(canvas, true, { stencil: true }, true);

const enemies = [];
const players = [];

// Минимальная обработка материалов
function processMaterials(meshes, scene) {
    meshes.forEach(mesh => {
        if (mesh.material) {
            mesh.material.backFaceCulling = false;
            
            if (mesh.name.toLowerCase().includes('bottom')) {
                mesh.material.alpha = 1.0;
                if (mesh.material.getClassName() === "PBRMaterial") {
                    mesh.material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
                }
            }
            
            if (mesh.material.getClassName() === "PBRMaterial") {
                const pbr = mesh.material;
                pbr.metallic = 0.0;
                pbr.roughness = 0.8;
                pbr.environmentIntensity = 0.8;
                
                // Улучшение для светящихся материалов
                if (mesh.name.toLowerCase().includes('light') || 
                    mesh.name.toLowerCase().includes('bulb') || 
                    mesh.name.toLowerCase().includes('flame')) {
                    pbr.emissiveIntensity = 3.0;
                    pbr.useEmissiveAsIllumination = true;
                }
            }
            
            mesh.material.markAsDirty();
        }
    });
}

// Функция загрузки уровня
const loadLevel = async (scene) => {
    console.log("Загрузка уровня...");
    
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync(
            "", "./public/models/city/", "massivee.glb", scene
        );
        
        console.log("Модель загружена, мешей:", result.meshes.length);
        
        // Обрабатываем материалы
        processMaterials(result.meshes, scene);
        assignMaterialsByName(result.meshes, scene);
        // Создаем контейнер и настраиваем меши
        const modelContainer = new BABYLON.TransformNode("levelContainer", scene);
        result.meshes.forEach(mesh => {
            if (mesh.parent === null) {
                mesh.checkCollisions = true;
                mesh.collisionsEnabled = true;
                mesh.parent = modelContainer;
            }else{
                mesh.checkCollisions = true;
                mesh.collisionsEnabled = true;
            }
        });
        
        // Масштабируем
        const scaleFactor = 5;
        modelContainer.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);

        return { ...result, container: modelContainer };
        
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        throw error;
    }
};

const createSkyboxFromSingleTexture = (scene) => {
    const skySphere = BABYLON.Mesh.CreateSphere("skySphere", 32, 1000, scene);
    skySphere.infiniteDistance = true;
    
    const skyMaterial = new BABYLON.StandardMaterial("skyMaterial", scene);
    skyMaterial.backFaceCulling = false;
    skyMaterial.disableLighting = true;
    
    const panoramaTexture = new BABYLON.Texture("./public/sky/2.png", scene);
    skyMaterial.diffuseTexture = panoramaTexture;
    skyMaterial.diffuseTexture.coordinatesMode = BABYLON.Texture.FIXED_EQUIRECTANGULAR_MODE;
    skyMaterial.diffuseTexture.wAng = Math.PI;
    
    skyMaterial.emissiveTexture = panoramaTexture;
    skyMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    skyMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skyMaterial.alpha = 1;
    
    skySphere.material = skyMaterial;
    return skySphere;
};

const setupLight = (scene) => {
    console.log("Настраиваем улучшенное освещение...");
    
    // Основной направленный свет (солнце)
    const mainLight = new BABYLON.DirectionalLight(
        "mainLight", 
        new BABYLON.Vector3(-0.8, -1, -0.4), 
        scene
    );
    mainLight.intensity = 1.2;
    mainLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85); // Теплый белый
    mainLight.specular = new BABYLON.Color3(1.0, 0.95, 0.85);
    mainLight.position = new BABYLON.Vector3(30, 50, 30);
    
    // Окружающее освещение
    const ambientLight = new BABYLON.HemisphericLight(
        "ambientLight", 
        new BABYLON.Vector3(0, 1, 0), 
        scene
    );
    ambientLight.intensity = 0.5;
    ambientLight.diffuse = new BABYLON.Color3(0.4, 0.4, 0.5);
    ambientLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);

    // Дополнительный заполняющий свет
    const fillLight = new BABYLON.DirectionalLight(
        "fillLight", 
        new BABYLON.Vector3(0.5, -0.5, 0.5), 
        scene
    );
    fillLight.intensity = 0.3;
    fillLight.diffuse = new BABYLON.Color3(0.8, 0.8, 0.9);  
    // Легкая постобработка для улучшения контраста
    scene.imageProcessingConfiguration.contrast = 1.2;
    scene.imageProcessingConfiguration.exposure = 1.1;
    
    return { ambientLight, mainLight, fillLight };
};

function setupFog(scene) {
    // Настраиваем легкий туман который не перекрывает скайбокс
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    scene.fogDensity = 0.006; // Легкая плотность
    scene.fogColor = new BABYLON.Color3(0.1, 0.3, 0.1);
    
    // Отключаем туман для скайбокса (если он есть)
    if (scene.skybox) {
        scene.skybox.material.fogEnabled = false;
    }
    
    console.log("Легкий туман настроен, скайбокс виден");
}

function setupAmbientOcclusion(scene) {
    // Простейший AO через пост-обработку
    scene.imageProcessingConfiguration.contrast = 1.3;
    scene.imageProcessingConfiguration.exposure = 0.9;
    
    // Легкое затемнение углов (виньетка)
    scene.imageProcessingConfiguration.vignetteBlendMode = BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    scene.imageProcessingConfiguration.vignetteWeight = 0.5;
}

function assignMaterialsByName(meshes, scene) {
    const textures = {
        'bricks1': 'brick_1.jpg',
        'bricks2': 'bricks_2.jpg', 
        'steel': 'metal_2.jpg',
        'stoneee': 'stone.jpg'
    };
    console.log("Назначаем материалы для примитивов...");

    meshes.forEach(mesh => {
        const meshName = mesh.name;
        let textureAssigned = false;
        
        for (const [key, textureName] of Object.entries(textures)) {
            if (meshName.includes(key)) {
                const material = new BABYLON.StandardMaterial(`${key}_mat`, scene);
                
                try {
                    material.diffuseTexture = new BABYLON.Texture(
                        `./public/models/city/textures/${textureName}`, 
                        scene
                    );
                } catch (e) {
                    material.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                }
                
                mesh.material = material;
                textureAssigned = true;
                break;
            }
        }
    });
}

// Инициализация неба и освещения
const initSky = (scene) => {
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
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        return { skybox: null, lights: light };
    }
};

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

// Курсор
function cursorShow(ui, scene) {
    const cursor = new BABYLON.GUI.Image("cursor", "./public/cursor.png");
    cursor.width = "64px";
    cursor.height = "64px";
    cursor.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    cursor.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    ui.addControl(cursor);

    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        time += deltaTime;
        cursor.left = Math.sin(time * 2 * 2 * Math.PI) * 5;
        cursor.top = Math.cos(time * 2 * 2 * Math.PI) * 5;
    });
}

// Создание окружения
async function createEnvironment(scene) {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 1000, height: 1000 }, scene);
    ground.checkCollisions = true;
    
    const groundMat = new BABYLON.StandardMaterial("groundMaterial", scene);
    const groundTexture = new BABYLON.Texture("./public/image.png", scene);
    groundTexture.uScale = 100;
    groundTexture.vScale = 100;
    groundMat.diffuseTexture = groundTexture;
    ground.material = groundMat;
}

function setupColorGrading(scene) {
    // Улучшаем цвет для объема
    scene.imageProcessingConfiguration.colorCurvesEnabled = true;
    scene.imageProcessingConfiguration.contrast = 1.2;
    scene.imageProcessingConfiguration.exposure = 0.9;
}

// Создание сцены
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    ui.rootContainer.isPointerBlocker = false;
    scene.preventDefaultOnPointerDown = false;
    scene.clearColor = new BABYLON.Color4(0.05, 0.02, 0.08, 1.0);
     setupFog(scene);
     setupAmbientOcclusion(scene);
     setupColorGrading(scene);
    // Загрузка уровня
    loadLevel(scene);

    // Инициализация
    initSky(scene);
    const player = new Player(scene, canvas, ui);
    players.push(player);
    player.CreateController({ x: 1, y: 5, z: 1 }, engine.getRenderHeight(), engine.getRenderWidth());
    player.createUI();
    window.player = player;
    
    // Физика
    scene.gravity = new BABYLON.Vector3(0, -9.81 / 60, 0);
    scene.collisionsEnabled = true;

    // Дополнительные элементы
    cursorShow(ui, scene);  
    createEnvironment(scene);
    createItems(scene);

    const light = new BABYLON.PointLight("pointLight", new BABYLON.Vector3(0, 5, 0), scene);
    light.diffuse = new BABYLON.Color3(1, 0, 0.1); // Теплый свет
    light.intensity = 1;
    light.range = 15;

    // Обработчики событий
    scene.onPointerDown = (evt) => {
        if (evt.button === 0) scene.getEngine().enterPointerlock();
        if (evt.button === 1) scene.getEngine().exitPointerlock();
    };

    return scene;
};

// Инициализация
let mainScene = createScene();
engine.runRenderLoop(() => mainScene.render());
window.addEventListener("resize", () => engine.resize());