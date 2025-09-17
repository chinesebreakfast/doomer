// AlphaSpriteSimple.js - упрощенная версия
class AlphaSprite {
    constructor(scene, textures, options = {}) {
        // Сразу создаем плоскость (пропорции настроим позже)
        
        this.textures = textures.map(url => {
            const tex = new BABYLON.Texture(url, scene);
            tex.hasAlpha = true;
            tex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE); // пиксельная графика
            tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
            tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            tex.anisotropicFilteringLevel = 1; // минимальное фильтрование
            return tex;
        });
        this.currentFrame = 0;
        this.isPlaying = false;
        this.loop = options.loop ?? true;
        this.frameSpeed = options.frimeSpeed || 100;

        this.mesh = BABYLON.MeshBuilder.CreatePlane(
            "sprite_" + Math.random(),
            { width: 1, height: 1 },
            scene
        );
        
        this.mesh.position = options.position || new BABYLON.Vector3(0, 0, 0);
        this.mesh.rotation = options.rotation || new BABYLON.Vector3(0, 0, 0);
        
        // Создаем материал
        this.material = new BABYLON.StandardMaterial("spriteMaterial", scene);
        this.material.diffuseTexture = this.textures[0];
        this.material.diffuseTexture.hasAlpha = true;
        this.material.useAlphaFromDiffuseTexture = true;
        this.material.backFaceCulling = false;
        this.material.specularColor = new BABYLON.Color3(0, 0, 0);
        this.material.alpha = options.alpha !== undefined ? options.alpha : 1;
        
        this.mesh.material = this.material;
        
        // Ждем загрузки текстуры и настраиваем пропорции
        this.material.diffuseTexture.onLoadObservable.add(() => {
            this.adjustAspectRatio(options.size || 1);
        });
    }
    
    adjustAspectRatio(size) {
        const texture = this.material.diffuseTexture;
        const textureWidth = texture.getSize().width;
        const textureHeight = texture.getSize().height;
        const aspectRatio = textureWidth / textureHeight;
        
        // Устанавливаем правильные размеры
        this.mesh.scaling.x = size;
        this.mesh.scaling.y = size / aspectRatio;
        
        // Сохраняем для будущих изменений
        this.aspectRatio = aspectRatio;
        this.baseSize = size;
    }
    
    setSize(size) {
        this.baseSize = size;
        this.mesh.scaling.x = size;
        this.mesh.scaling.y = size / this.aspectRatio;
    }
    
    setPosition(x, y, z) {
        this.mesh.position = new BABYLON.Vector3(x, y, z);
    }
    
    setAlpha(alpha) {
        this.material.alpha = alpha;
    }
}