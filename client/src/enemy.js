class Enemy {
    constructor(scene, position, speed = 0.05){
        this.scene = scene;
        this.mesh = BABYLON.MeshBuilder.CreateBox("enemy", {size:2}, scene);
        this.mesh.position = position.clone();
        this.mesh.material = new BABYLON.StandardMaterial("enemyMat", scene);
        this.mesh.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.speed = speed;
        this.mesh.checkCollisions = true;
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