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
    constructor(scene, canvas, gui) {
        this.scene = scene;
        this.canvas = canvas;
        this.camera = null;
        this.gui = gui;

        this.health = 3;
        this.maxHealth = 3;
        this.healtUI = null;

        this.inventory = [null, null];
        this.selectedSlot = 0;
        this.pickDistance = 3;
        this.pickKey = "KeyE";
        this.throwKey = "KeyQ";
        this.slotOffsetY = 0.3;
        this.slotLiftTime = 200; 

        // Для head bob
        this.bobAmplitude = 0.05;  // амплитуда
        this.bobFrequency = 10;    // частота
        this.bobTime = 0;          // внутренний таймер
        this.prevPosition = null;   // для вычисления скорости
        this.baseHeight = 2;
        this.keysPressed = { w: false, a: false, s: false, d: false };
        this.setupControls();

        this.handsPositions = [
            new BABYLON.Vector3(0.5, -0.5, 2), // слот 0
            new BABYLON.Vector3(-0.5, -0.5, 2) // слот 1
        ];
    }


    createHealthUI(){
        this.healthUI = [];

        const startX = 10;
        const spacing = 100;

        for (let i = 0; i < this.maxHealth; i++){
            const heart = new BABYLON.GUI.Image("heart" + i, "./public/sprites/skull.png");
            heart.width = "140px";
            heart.height = "140px";
            heart.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
            heart.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
            heart.left = startX + i * spacing;
            heart.top = 20;
            this.gui.addControl(heart);
            this.healthUI.push(heart);
        }
        this.updateHealthUI();
    }

        // Обновляем UI при потере здоровья
    updateHealthUI() {
        this.healthUI.forEach((heart, i) => {
            heart.isVisible = i < this.health;
        });
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        this.updateHealthUI();
    }

    heal(amount = 1) {
        this.health += amount;
        if (this.health > this.maxHealth) this.health = this.maxHealth;
        this.updateHealthUI();
    }


    setupControls() {
        this.canvas.tabIndex = 0; // чтобы canvas мог получать фокус
        this.canvas.focus();

        this.canvas.addEventListener("keydown", (e) => {
            switch (e.code) {
                case "KeyW": this.keysPressed.w = true; break;
                case "KeyA": this.keysPressed.a = true; break;
                case "KeyS": this.keysPressed.s = true; break;
                case "KeyD": this.keysPressed.d = true; break;
                case "KeyE": this.tryPickup(); break;
                case "KeyQ": this.throwItem(); break;
            }
        });

        this.canvas.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyW": this.keysPressed.w = false; break;
                case "KeyA": this.keysPressed.a = false; break;
                case "KeyS": this.keysPressed.s = false; break;
                case "KeyD": this.keysPressed.d = false; break;
            }
        });

        this.canvas.addEventListener("wheel", (e) => {
            if (e.deltaY > 0) this.changeSlot(1);
            else this.changeSlot(-1);
        });
    }

    isMoving() {
        return this.keysPressed.w || this.keysPressed.a || this.keysPressed.s || this.keysPressed.d;
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
    const time = performance.now() * 0.002;

    this.inventory.forEach((mesh, i) => {
        if (!mesh) return;

        // Базовая позиция слота
        const base = this.handsPositions[i].clone();

        // Если слот выбран, поднимаем оружие
        if (i === this.selectedSlot) {
            base.y += this.slotLift;
        }

        // Проверяем движение
        const moving = this.keysPressed && (this.keysPressed.w || this.keysPressed.a || this.keysPressed.s || this.keysPressed.d);

        if (moving) {
            const swayX = Math.sin(time * 2) * 0.05;
            const swayY = Math.cos(time * 4) * 0.03;

            mesh.position.x = base.x + swayX;
            mesh.position.y = base.y + swayY;
            mesh.position.z = base.z;

            // Лёгкий наклон
            mesh.rotation.z = Math.sin(time * 2) * 0.02;
            mesh.rotation.x = Math.cos(time * 2) * 0.01;
        } else {
            // Стоим на месте — оружие в базовой позиции
            mesh.position.copyFrom(base);
            mesh.rotation.set(0, 0, 0);
        }
    });
}

    updateBob() {
        if (!this.prevPosition) return;

        // Вычисляем скорость движения игрока
        //const delta = this.camera.position.subtract(this.prevPosition);
        //const speed = delta.length();

        if (this.isMoving) { // движется
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
        mesh.isPickable = false;

        // позиция слота
        mesh.position = slotIndex === 0
            ? new BABYLON.Vector3(0.5, -0.5, 2)
            : new BABYLON.Vector3(-0.5, -0.5, 2);
        mesh.rotation = new BABYLON.Vector3(0, 0, 0);

        // поднятие активного предмета
        if (slotIndex === this.selectedSlot) {
            mesh.position.y += this.slotOffsetY;
        }
    }

    changeSlot(deltaY) {
        if (!this.inventory.some(m => m)) return; // если нет предметов
        const oldSlot = this.selectedSlot;
        if (deltaY > 0) this.selectedSlot = (this.selectedSlot + 1) % this.inventory.length;
        else this.selectedSlot = (this.selectedSlot - 1 + this.inventory.length) % this.inventory.length;

        console.log(`Сменили слот с ${oldSlot} на ${this.selectedSlot}`);
}


    animateSlotChange(oldSlot, newSlot) {
        // Опускаем старый слот
        if (this.inventory[oldSlot]) {
            this.inventory[oldSlot].position.y -= this.slotOffsetY;
        }

        // Поднимаем новый слот плавно
        if (this.inventory[newSlot]) {
            const mesh = this.inventory[newSlot];
            mesh.position.y += this.slotOffsetY;
            setTimeout(() => {
                if (mesh) mesh.position.y -= this.slotOffsetY;
            }, this.slotLiftTime);
        }
    }

    useItem(slotIndex) {
        const mesh = this.inventory[slotIndex];
        if (!mesh) return;

        console.log("Используем предмет:", mesh.name);
        // тут логика применения предмета (стрельба, атака и т.д.)
    }

    throwItem() {
        const mesh = this.inventory[this.selectedSlot];
        if (!mesh) return;

        // Снимаем с камеры
        mesh.parent = null;
        mesh.checkCollisions = true;

        // Ставим перед игроком на высоте y = 3
        const forward = this.camera.getForwardRay().direction;
        mesh.position = this.camera.position.add(forward.scale(3));
        mesh.position.y = 2;
        mesh.isPickable = true;

        this.inventory[this.selectedSlot] = null;
}
}
