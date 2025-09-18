class Enemy {
    constructor(scene, position, modelName,  scale = 1, speed = 0.05){
        this.scene = scene;
        // Невидимый хитбокс
        this.mesh = BABYLON.MeshBuilder.CreateBox("enemyHitbox", { size: 2 }, scene);
        this.mesh.position = position.clone();
        this.mesh.checkCollisions = true;
        this.mesh.isVisible = false;

        this.speed = speed;
        this.modelName = modelName;

        BABYLON.SceneLoader.ImportMeshAsync("", "./public/models/enemies/", this.modelName, scene).then(result => {
            const model = result.meshes[0];
            model.scaling = new BABYLON.Vector3(scale, scale, scale);
            model.checkCollisions = false;
            model.parent = this.mesh;
        });

        
    }

    update(players){
        if (!players || players.length === 0) return;

        let nearestPlayer = null;
        let minDist = Infinity;
        for(let player of players){
            const dist = BABYLON.Vector3.Distance(this.mesh.position, player.camera.position);
            if (dist < minDist){
                minDist = dist;
                nearestPlayer = player;
            }
        }

    if(nearestPlayer){
        const direction = nearestPlayer.camera.position.subtract(this.mesh.position).normalize();

        this.mesh.moveWithCollisions(direction.scale(this.speed));

        this.mesh.lookAt(nearestPlayer.camera.position);
    }
    }
    
}