BABYLON.Effect.ShadersStore["pixelateVertexShader"] = `
  precision highp float;

  // стандартные атрибуты/униформы
  attribute vec2 position;
  varying vec2 vUV;

  void main(void) {
    vUV = (position + 1.0) * 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

BABYLON.Effect.ShadersStore["pixelateFragmentShader"] = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D textureSampler;
  uniform float pixelSize;

  void main(void) {
    vec2 uv = vUV;
    uv = floor(uv * pixelSize) / pixelSize; // уменьшаем детализацию
    gl_FragColor = texture2D(textureSampler, uv);
  }
`;

class Player {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.camera = null;

        this.inventory = [null, null];
        this.pickDistance = 3;
        this.pickKey = "KeyE";

        // Для head bob
        this.bobAmplitude = 0.05;  // амплитуда
        this.bobFrequency = 10;    // частота
        this.bobTime = 0;          // внутренний таймер
        this.prevPosition = null;   // для вычисления скорости
        this.baseHeight = 2;

        window.addEventListener("keydown", (event) => {
            if (event.code === this.pickKey) {
                console.log("Попытка подобрать предмет");
                this.tryPickup();
            }
        });
    }


    CreateController(position){
        this.camera = new BABYLON.FreeCamera("camera", 
            new BABYLON.Vector3(position.x, position.y, position.z),
            this.scene);

        const pixelEffect = new BABYLON.PostProcess(
            "pixelEffect",   // имя эффекта
            "pixelate",      // имя шейдера (мы его сейчас создадим)
            ["pixelSize"],   // параметры, которые будем менять
            null,
            1.0,             // масштаб (1 = во весь экран)
            this.camera           // та самая камера игрока
        );

        pixelEffect.onApply = function(effect) {
            effect.setFloat("pixelSize", 100.0); // чем меньше число — тем крупнее «пиксели»
        };

        this.camera.attachControl(this.canvas, true);
        this.camera.applyGravity = true;
        this.camera.checkCollisions = true;
        this.camera.ellipsoid = new BABYLON.Vector3(1, 1, 1);
        this.camera.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0); 
        this.camera.minZ = 0.1;

        this.camera.keysUp.push(87);    // W
        this.camera.keysDown.push(83);  // S
        this.camera.keysLeft.push(65);  // A
        this.camera.keysRight.push(68); // D
        this.camera.speed = 0.7;

        this.camera.angularSensibility = 1000;
        this.prevPosition = this.camera.position.clone();
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateBob();
            this.updateWeaponSway();
        });
    }

    updateWeaponSway() {
    const time = performance.now() * 0.002; // таймер
    this.inventory.forEach((mesh, i) => {
        if (!mesh) return;

        // Базовые позиции для оружия
        const basePos = (i === 0)
            ? new BABYLON.Vector3(0.5, -0.5, 2)   // правая рука
            : new BABYLON.Vector3(-0.5, -0.5, 2); // левая рука

        // Покачивание
        const swayX = Math.sin(time * 2) * 0.05;  // влево-вправо
        const swayY = Math.cos(time * 4) * 0.03;  // вверх-вниз

        mesh.position.x = basePos.x + swayX;
        mesh.position.y = basePos.y + swayY;
        mesh.position.z = basePos.z;

        // Лёгкий наклон
        mesh.rotation.z = Math.sin(time * 2) * 0.02;
        mesh.rotation.x = Math.cos(time * 2) * 0.01;
    });
}

    updateBob() {
        if (!this.prevPosition) return;

        // Вычисляем скорость движения игрока
        const delta = this.camera.position.subtract(this.prevPosition);
        const speed = delta.length();

        if (speed > 0.001) { // движется
            this.bobTime += this.scene.getEngine().getDeltaTime() / 1000 * this.bobFrequency;
            this.camera.position.y = this.baseHeight + Math.sin(this.bobTime) * this.bobAmplitude;
        } else { // стоит на месте
            this.bobTime = 0;
            this.camera.position.y = this.baseHeight;
        }

        this.prevPosition.copyFrom(this.camera.position);
    }

    addItem(mesh){
        for(let i=0; i < this.inventory.length; i++){
            if(!this.inventory[i]){
                this.inventory[i] = mesh;
                this.attachToCamera(mesh, i);
                break;
            }
        }
        return false;
    }

    tryPickup() {
        const ray = new BABYLON.Ray(this.camera.position, this.camera.getForwardRay().direction, this.pickDistance);
        const hit = this.scene.pickWithRay(ray, (mesh) => mesh.isPickable);
        if (hit && hit.pickedMesh) {
            this.addItem(hit.pickedMesh);
        }
    }

    attachToCamera(mesh, slotIndex) {
        mesh.parent = this.camera;
        mesh.checkCollisions = false;

        if (slotIndex === 0) {
            mesh.position = new BABYLON.Vector3(0.5, -0.5, 2); // правая рука
        } else if (slotIndex === 1) {
            mesh.position = new BABYLON.Vector3(-0.5, -0.5, 2); // левая рука
        }

        mesh.rotation = new BABYLON.Vector3(0, 0, 0);
    }

    useItem(slotIndex) {
        const mesh = this.inventory[slotIndex];
        if (!mesh) return;

        console.log("Используем предмет:", mesh.name);
        // тут логика применения предмета (стрельба, атака и т.д.)
    }

    removeItem(slotIndex) {
        const mesh = this.inventory[slotIndex];
        if (!mesh) return;

        mesh.parent = null;
        mesh.dispose();
        this.inventory[slotIndex] = null;
    }
}
