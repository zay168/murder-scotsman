document.addEventListener("DOMContentLoaded", () => {
    // 3D Scene Setup
    const scene = new THREE.Scene();
    // Moonlight Midnight fog
    scene.fog = new THREE.FogExp2(0x020308, 0.015);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Positioned as if sitting at the back of the caboose or looking out a back window
    camera.position.set(0, 5, 20);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x020308, 1);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '-1';
    renderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(renderer.domElement);

    // =====================================
    // LIGHTING
    // =====================================
    const ambientLight = new THREE.AmbientLight(0x101525, 1.5); // Midnight ambient
    scene.add(ambientLight);

    // Warm lantern light attached to the train
    const trainLight = new THREE.PointLight(0xffbd59, 2, 80);
    trainLight.position.set(0, 6, 18);
    scene.add(trainLight);

    // Distant moonlight
    const moonlight = new THREE.DirectionalLight(0x52669e, 0.6);
    moonlight.position.set(-50, 50, -50);
    scene.add(moonlight);

    // =====================================
    // GROUND & ENVIRONMENT
    // =====================================
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x05080a,
        roughness: 1,
        metalness: 0,
        flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.5;
    scene.add(ground);

    // =====================================
    // TRACKS
    // =====================================
    const trackGroup = new THREE.Group();

    // Continuous Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 });
    const railGeo = new THREE.BoxGeometry(0.3, 0.4, 400);
    const rail1 = new THREE.Mesh(railGeo, railMat);
    rail1.position.set(-2.5, -2, -150);
    const rail2 = new THREE.Mesh(railGeo, railMat);
    rail2.position.set(2.5, -2, -150);
    scene.add(rail1);
    scene.add(rail2);

    // Sleepers (Moving ties)
    const sleeperGeo = new THREE.BoxGeometry(7, 0.2, 0.8);
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x22130c, roughness: 0.9 });

    const sleepers = [];
    for (let i = 0; i < 80; i++) {
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.set(0, -2.2, -i * 4);
        trackGroup.add(sleeper);
        sleepers.push(sleeper);
    }
    scene.add(trackGroup);

    // =====================================
    // SCENERY (Trees & Telegraph Poles)
    // =====================================
    const sceneryGroup = new THREE.Group();

    // Tree geometry
    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3);
    const treeLeavesGeo = new THREE.ConeGeometry(2, 6, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1a0f08 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x08170b, flatShading: true });

    // Pole geometry
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2e1c11 });

    const sceneryObjects = [];

    for (let i = 0; i < 60; i++) {
        const isPole = Math.random() > 0.85;
        const obj = new THREE.Group();

        if (isPole) {
            // Telegraph Pole
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 3.5;
            const barGeo = new THREE.BoxGeometry(2.5, 0.2, 0.2);
            const bar = new THREE.Mesh(barGeo, poleMat);
            bar.position.set(0, 8, 0);
            obj.add(pole);
            obj.add(bar);
        } else {
            // Low-poly Pine Tree
            const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
            trunk.position.y = -1;
            const leaves = new THREE.Mesh(treeLeavesGeo, leavesMat);
            leaves.position.y = 3.5;
            obj.add(trunk);
            obj.add(leaves);
        }

        const side = Math.random() > 0.5 ? 1 : -1;
        // Place them on sides of tracks
        obj.position.x = side * (8 + Math.random() * 40);
        obj.position.z = -Math.random() * 300;

        if (!isPole) {
            const scale = 0.8 + Math.random() * 1.5;
            obj.scale.set(scale, scale, scale);
            obj.rotation.y = Math.random() * Math.PI; // Random twist
        }

        sceneryGroup.add(obj);
        sceneryObjects.push(obj);
    }
    scene.add(sceneryGroup);

    // =====================================
    // SKIES & PARTICLES
    // =====================================
    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 1500;
    const starsPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
        starsPos[i] = (Math.random() - 0.5) * 600;     // X spread
        starsPos[i + 1] = 40 + Math.random() * 200;      // Y height
        starsPos[i + 2] = (Math.random() - 0.5) * 600;   // Z depth
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // Glowing Embers from Steam Engine
    const embersGeo = new THREE.BufferGeometry();
    const embersCount = 150;
    const embersPos = new Float32Array(embersCount * 3);
    for (let i = 0; i < embersCount * 3; i += 3) {
        embersPos[i] = (Math.random() - 0.5) * 15;
        embersPos[i + 1] = 2 + Math.random() * 8;
        embersPos[i + 2] = -10 - Math.random() * 40;
    }
    embersGeo.setAttribute('position', new THREE.BufferAttribute(embersPos, 3));
    const embersMat = new THREE.PointsMaterial({
        color: 0xff8800,
        size: 0.5,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.9
    });
    const embers = new THREE.Points(embersGeo, embersMat);
    scene.add(embers);

    // =====================================
    // ANIMATION
    // =====================================
    const speed = 0.35; // Slower atmospheric speed
    let clock = 0;

    function animate() {
        requestAnimationFrame(animate);
        clock += 0.016;

        // Move Sleepers
        sleepers.forEach(sleeper => {
            sleeper.position.z += speed;
            if (sleeper.position.z > 25) {
                sleeper.position.z -= 320; // 80 sleepers * 4 spacing
            }
        });

        // Move Scenery
        sceneryObjects.forEach(obj => {
            obj.position.z += speed;
            if (obj.position.z > 25) {
                obj.position.z -= 300;
                // Randomize position again when looping
                const side = Math.random() > 0.5 ? 1 : -1;
                obj.position.x = side * (8 + Math.random() * 40);
                if (obj.children.length === 2 && obj.children[1].geometry.type === 'ConeGeometry') {
                    const s = 0.8 + Math.random() * 1.5;
                    obj.scale.set(s, s, s);
                }
            }
        });

        // Fly Embers
        const ePos = embers.geometry.attributes.position.array;
        for (let i = 0; i < embersCount; i++) {
            ePos[i * 3] += Math.sin(clock * 5 + i) * 0.1;   // sway X
            ePos[i * 3 + 1] += 0.05 + Math.random() * 0.1;  // float Y up
            ePos[i * 3 + 2] += speed * 1.2;                 // move Z out

            if (ePos[i * 3 + 2] > 25 || ePos[i * 3 + 1] > 15) {
                // Reset ember at front of train
                ePos[i * 3] = (Math.random() - 0.5) * 8;
                ePos[i * 3 + 1] = 4 + Math.random() * 4;
                ePos[i * 3 + 2] = -30 - Math.random() * 20;
            }
        }
        embers.geometry.attributes.position.needsUpdate = true;

        // Realistic Camera Shake & Sway
        camera.position.x = Math.sin(clock * 12) * 0.04 + Math.cos(clock * 7.5) * 0.02;
        camera.position.y = 5 + Math.sin(clock * 22) * 0.04;
        camera.rotation.z = Math.sin(clock * 3) * 0.005; // Slight wagon roll

        // Lantern Flickering
        trainLight.intensity = 1.8 + Math.random() * 0.4;
        trainLight.position.x = Math.sin(clock * 8) * 0.2; // lantern swinging

        renderer.render(scene, camera);
    }
    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
