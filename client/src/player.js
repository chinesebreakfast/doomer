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
    uniform vec2 screenSize; // добавляем размеры экрана

    void main(void) {
        vec2 uv = vUV;
        uv *= screenSize;             // переводим UV в пиксели
        uv = floor(uv / pixelSize) * pixelSize; // делаем пикселизацию
        uv /= screenSize;             // обратно в 0..1
        gl_FragColor = texture2D(textureSampler, uv);
    }
`;

class Player {

    constructor(scene, canvas, gui) {
        this.scene = scene;
        this.canvas = this.scene.getEngine().getRenderingCanvas();
        this.camera = null;
        this.gui = gui;

        this.health = 3;
        this.maxHealth = 3;
        this.healtUI = null;

        this.inventory = [null, null];
        this.selectedSlot = 0;
        this.pickDistance = 3;
        this.slotOffsetY = 0.3;
        this.slotLiftTime = 200; 
        this.isSwitchingSlot = false;

        this.itemContainers = [];
        this.moving = false;

        // Для head bob
        this.bobAmplitude = 0.08;    // Сила покачивания (можно настроить)
        this.bobFrequency = 12;      // Скорость покачивания (можно настроить)
        this.bobTime = 0;
        this.baseHeight = 2;         // Базовая высота камеры
        this.prevPosition = null;

        this.keysPressed = { w: false, a: false, s: false, d: false };
        this.moving = this.keysPressed.w || this.keysPressed.a || 
                 this.keysPressed.s || this.keysPressed.d;
   
        this.setupControls();
        this.setupGameLoop();

        this.handsPositions = [
            new BABYLON.Vector3(0.5, -0.5, 2), // слот 0
            new BABYLON.Vector3(-0.5, -0.5, 2) // слот 1
        ];
        
    }

    setupGameLoop(){
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateBob();
            this.updateWeaponSway();
            this.update();
        });
    }

    update(){
        this.moving = this.keysPressed.w || this.keysPressed.a || 
                 this.keysPressed.s || this.keysPressed.d;
        this.handleActions();
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
        console.log("SETUP CONTROLS");
        // Простые обработчики
        document.addEventListener("keydown", (e) => {
            switch (e.code) {
                case "KeyW": this.keysPressed.w = true; break;
                case "KeyA": this.keysPressed.a = true; break;
                case "KeyS": this.keysPressed.s = true; break;
                case "KeyD": this.keysPressed.d = true; break;
                case "KeyE": this.tryPickup(); break; // Прямой вызов!
                case "KeyQ": this.throwItem(); break;
            }
        });

        document.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "KeyW": this.keysPressed.w = false; break;
                case "KeyA": this.keysPressed.a = false; break;
                case "KeyS": this.keysPressed.s = false; break;
                case "KeyD": this.keysPressed.d = false; break;
            }
        });

        // Колесико мыши
        this.canvas.addEventListener("wheel", (e) => {
            if (e.deltaY > 0) this.changeSlot(1);
            else this.changeSlot(-1);
        });
        
        this.scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            if (pointerInfo.event.button === 0) { // ЛКМ
                this.useItem();
            }
        }
    });
    }

    handleActions() {
        // Для действий, которые нужно обрабатывать в цикле
    }
        
    CreateController(position, height, width){
        this.camera = new BABYLON.FreeCamera("camera", 
            new BABYLON.Vector3(position.x, position.y, position.z),
            this.scene);

        const pixelEffect = new BABYLON.PostProcess(
            "pixelEffect",   // имя эффекта
            "pixelate",      // имя шейдера
            ["pixelSize", "screenSize"],   // параметры, которые будем менять
            null,
            1.0,             // масштаб (1 = во весь экран)
            this.camera           // та самая камера игрока
        );

        pixelEffect.onApply = function(effect) {
            effect.setFloat("pixelSize", 5); // чем меньше число — тем крупнее «пиксели»
            effect.setFloat2("screenSize", width, height);
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
    }
    updateWeaponSway() {
        // Проверяем движется ли игрок
        const isMoving = this.keysPressed.w || this.keysPressed.a || 
                        this.keysPressed.s || this.keysPressed.d;

        if (!isMoving) return;

        const time = performance.now() * 0.002;

        // Проверяем что itemContainers существует
        if (!this.itemContainers) return;

        this.inventory.forEach((item, slotIndex) => {
            // Проверяем все условия
            if (!item || !this.itemContainers[slotIndex]) return;
            
            const container = this.itemContainers[slotIndex];
            if (!container) return;
            
            // Простое покачивание
            container.position.y += Math.cos(time * 5) * 0.01;
            container.rotation.z = Math.sin(time * 3) * 0.01;
        });
    }

    updateBob() {
        if (!this.camera) return; // ← ДОБАВЬТЕ ПРОВЕРКУ КАМЕРЫ
        
        if (!this.prevPosition) {
            this.prevPosition = this.camera.position.clone();
            return;
        }

        const isMoving = this.keysPressed.w || this.keysPressed.a || 
                        this.keysPressed.s || this.keysPressed.d;

        if (isMoving) {
            // Простое вертикальное покачивание
            this.bobTime += this.scene.getEngine().getDeltaTime() / 1000 * this.bobFrequency;
            this.camera.position.y = this.baseHeight + Math.sin(this.bobTime) * this.bobAmplitude;
        } else {
            // Мгновенный возврат к нормальной высоте
            this.camera.position.y = this.baseHeight;
            this.bobTime = 0;
        }

        this.prevPosition.copyFrom(this.camera.position);
    }

    addItem(item){
        console.log("add Item", item?.type);
        if(!item)
        {
            console.log("Нет предмета");
            return false;
        }
        // Пробуем добавить в выбранный слот сначала
        if (!this.inventory[this.selectedSlot]) {
            this.inventory[this.selectedSlot] = item;
            console.log("✅ Предмет добавлен в выбранный слот", this.selectedSlot);
            
            if (item.model) {
                this.attachToCamera(item.model, this.selectedSlot);
            }
            return true;
        }

        // Если выбранный слот занят, ищем любой свободный
        for (let i = 0; i < this.inventory.length; i++) {
            if (!this.inventory[i]) {
                this.inventory[i] = item;
                console.log("✅ Предмет добавлен в свободный слот", i);
                
                if (item.model) {
                    item.slotIndex = i;
                    this.attachToCamera(item.model, i);
                }
                return true;
            }
        }
        console.log("Инвентарь полон");
        return false;  
    }

    tryPickup() {
        console.log("🔍 Поиск предметов по расстоянию");
        
        const playerPos = this.camera.position;
        const maxDistance = 5; // Максимальная дистанция подбора
        let closestItem = null;
        let minDistance = Infinity;

        // Ищем все предметы на сцене
        this.scene.meshes.forEach(mesh => {
            if (mesh.itemInstance && mesh.isPickable && mesh.isEnabled()) {
                const distance = BABYLON.Vector3.Distance(playerPos, mesh.position);
                
                console.log(`📦 ${mesh.name}: ${distance.toFixed(2)}m`);
                
                // Ищем самый близкий предмет в радиусе
                if (distance < maxDistance && distance < minDistance) {
                    minDistance = distance;
                    closestItem = mesh;
                }
            }
        });

        if (closestItem) {
            console.log(`🎯 Подбираем: ${closestItem.name} (${minDistance.toFixed(2)}m)`);
            this.addItem(closestItem.itemInstance);
            closestItem.isPickable = false;
            closestItem.setEnabled(false);
        } else {
            console.log("❌ Нет предметов рядом");
        }
    }
    
    attachToCamera(mesh, slotIndex) {
        if (!mesh || !this.camera) return;

        const realMeshes = mesh.getDescendants(false).filter(m => m.name !== '__root__');
        const realItemMesh = realMeshes[0] || mesh;

        const container = new BABYLON.TransformNode("weapon_container", this.scene);
        container.parent = this.camera;
        
        const itemType = mesh.itemInstance?.type;
        const itemAttachPos = itemTypes[itemType]?.attach;
        const scale = itemTypes[itemType]?.scale || 1;

        realItemMesh.parent = container;
        realItemMesh.checkCollisions = false;
        realItemMesh.position = BABYLON.Vector3.Zero();
        realItemMesh.rotation = BABYLON.Vector3.Zero();
        realItemMesh.scaling = new BABYLON.Vector3(scale, scale, scale);

        if (itemAttachPos) {
            container.position = new BABYLON.Vector3(
                slotIndex === 0 ? itemAttachPos.right : itemAttachPos.left,
                itemAttachPos.y, // Начинаем скрытым внизу
                itemAttachPos.z
            );
            container.rotation = itemAttachPos.rotation;
        } else {
            container.position = new BABYLON.Vector3(
                slotIndex === 0 ? 0.3 : -0.3,
                -2.0, // Начинаем скрытым внизу
                2.0
            );
        }

        if (!this.itemContainers) this.itemContainers = [];
        this.itemContainers[slotIndex] = container;

        // Сразу скрываем если это не активный слот
        if (slotIndex !== this.selectedSlot) {
            this.setSlotVisibility(slotIndex, false);
        }
    }

    getActiveItem(){
        return this.inventory[this.selectedSlot];
    }

    changeSlot(deltaY) {
        if (!this.inventory.some(m => m) || this.isSwitchingSlot) return;
        
        this.isSwitchingSlot = true; // Блокируем переключение во время анимации
        
        const oldSlot = this.selectedSlot;
        if (deltaY > 0) {
            this.selectedSlot = (this.selectedSlot + 1) % this.inventory.length;
        } else {
            this.selectedSlot = (this.selectedSlot - 1 + this.inventory.length) % this.inventory.length;
        }

        console.log(`🔀 Смена слота: ${oldSlot} → ${this.selectedSlot}`);
        
        // Запускаем анимацию переключения
        this.animateSlotChange(oldSlot, this.selectedSlot);
        
        // Разблокируем через время анимации
        setTimeout(() => {
            this.isSwitchingSlot = false;
        }, 400);
    }

    animateSlotChange(oldSlot, newSlot) {
        // 1. Скрываем старый предмет (плавно опускаем вниз)
        if (this.inventory[oldSlot] && this.itemContainers[oldSlot]) {
            this.hideSlot(oldSlot);
        }

        // 2. Показываем новый предмет (плавно поднимаем снизу)
        if (this.inventory[newSlot] && this.itemContainers[newSlot]) {
            this.showSlot(newSlot);
        }
    }

    hideSlot(slotIndex) {
        const container = this.itemContainers[slotIndex];
        const targetY = -2.0; // Полностью скрыть внизу
        
        this.animateContainer(container,
            container.position.x,
            targetY,
            container.position.z,
            300,
            () => {
                // После анимации полностью скрываем
                this.setSlotVisibility(slotIndex, false);
            }
        );
    }

    // Показ слота (плавное поднятие снизу)
    showSlot(slotIndex) {
        const container = this.itemContainers[slotIndex];
        const itemType = this.inventory[slotIndex]?.type;
        
        // Позиция зависит от типа предмета
        const targetY = itemType === 'tool' ? -0.3 : -0.4;
        
        // Сначала показываем (но еще внизу)
        this.setSlotVisibility(slotIndex, true);
        container.position.y = -2.0; // Начальная позиция (внизу)
        
        // Плавно поднимаем к целевой позиции
        this.animateContainer(container,
            container.position.x,
            targetY,
            container.position.z,
            400
        );
    }

    // Установить видимость слота
    setSlotVisibility(slotIndex, visible) {
        const item = this.inventory[slotIndex];
        if (!item || !item.model || !this.itemContainers[slotIndex]) return;

        const allMeshes = item.model.getDescendants(false);
        allMeshes.push(item.model);
        
        allMeshes.forEach(mesh => {
            mesh.setEnabled(visible);
        });
        
        this.itemContainers[slotIndex].setEnabled(visible);
    }

    // Плавная анимация контейнера
    animateContainer(container, targetX, targetY, targetZ, duration, onComplete = null) {
        const startX = container.position.x;
        const startY = container.position.y;
        const startZ = container.position.z;
        
        const startTime = Date.now();
        const endTime = startTime + duration;

        const animate = () => {
            const currentTime = Date.now();
            const progress = Math.min(1, (currentTime - startTime) / duration);
            
            // Плавная интерполяция (easeOut)
            const ease = 1 - Math.pow(1 - progress, 3);
            
            container.position.x = startX + (targetX - startX) * ease;
            container.position.y = startY + (targetY - startY) * ease;
            container.position.z = startZ + (targetZ - startZ) * ease;

            if (currentTime < endTime) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };

        animate();
    }

    useItem() {
        const activeItem = this.getActiveItem();
        if(!activeItem){
            console.log("\\Нет предмета в активном слоте//");
            return;
        }
        console.log(`🎯 Используем предмет в слоте ${this.selectedSlot}: ${activeItem.type}`);
        
        // Вызываем метод use() у предмета
        if (activeItem.use && typeof activeItem.use === 'function') {
            activeItem.use();
        } else {
            console.log(`❌ Предмет ${activeItem.type} не имеет метода use()`);
        }

    }
    async throwItem() {
        const item = this.inventory[this.selectedSlot];
        if (!item) return;

        const itemType = item.type;
        
        // 1. Очищаем инвентарь
        this.inventory[this.selectedSlot] = null;
        
        // 2. Удаляем визуальную часть
        if (item.model) {
            item.model.dispose();
        }
        if (this.itemContainers && this.itemContainers[this.selectedSlot]) {
            this.itemContainers[this.selectedSlot].dispose();
            this.itemContainers[this.selectedSlot] = null;
        }

        // 3. Создаем новый предмет на земле
        const dropPosition = this.camera.position.add(
            this.camera.getForwardRay().direction.scale(2.5)
        );
        dropPosition.y = 1.0;

        const newItem = new Item(this.scene, {
            type: itemType,
            position: dropPosition,
            scale: itemTypes[itemType]?.originalScale || 1
        });
        await newItem.spawnItem();
        console.log(`🎯 ${itemType} создан на земле`);
    }

    getPosition(){
        return this.camera.position.clone();
    }
}

//Использование предмета, в каждом предмете должна быть функция use()
//playanim(Shot) - Любое использование 
//метод использования зависит от типа предмета



