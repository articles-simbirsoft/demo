import "/src/assets/style.scss";
import * as THREE from 'three';
import vertex from './glsl/vertex.glsl';
import fragment from './glsl/fragment.glsl';

const lerp = (start, end, t) => {
    return start * (1 - t) + end * t;
};

class MeshItem {
    constructor(element, scene) {
        this.element = element;
        this.scene = scene;
        this.offset = new THREE.Vector2(0, 0);
        this.sizes = new THREE.Vector2(0, 0);
        this.createMesh();
    }

    getDimensions() {
        const { width, height, top, left } = this.element.getBoundingClientRect();
        this.sizes.set(width, height);
        this.offset.set(left - window.innerWidth / 2 + width / 2, -top + window.innerHeight / 2 - height / 2);
    }

    createMesh() {
        const geometry = new THREE.PlaneGeometry(1, 1, 10, 10);
        const imageTexture = new THREE.TextureLoader().load(this.element.src);
        imageTexture.minFilter = THREE.LinearFilter;
        this.uniforms = {
            uTexture: { value: imageTexture },
            uOffset: { value: new THREE.Vector2(0.0, 0.0) },
            uAlpha: { value: 1.0 },
            u_mouse: { type: "v2", value: new THREE.Vector2() },
            u_time: { type: "f", value: 0.0 },
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            //wireframe: true,
            side: THREE.DoubleSide
        })

        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }

    render(velocity = 0, mouseCoordinates, selectMesh) {
        this.getDimensions();
        this.mesh.position.set(this.offset.x, this.offset.y, 0);
        this.mesh.scale.set(this.sizes.x, this.sizes.y, 1);

        this.uniforms.uOffset.value.set(this.offset.x * 0.5, -(velocity) * 0.0003);

        if (this.mesh.uuid === selectMesh?.uuid) {
            this.uniforms.u_mouse.value.x = lerp(0.0, mouseCoordinates.x, 0.6);
            this.uniforms.u_mouse.value.y = lerp(0.0, mouseCoordinates.y, 0.6);
            this.uniforms.u_time.value += 0.05;
            return;
        }
        this.uniforms.u_mouse.value.x = lerp(this.uniforms.u_mouse.value.x, 0.0, 0.02);
        this.uniforms.u_mouse.value.y = lerp(this.uniforms.u_mouse.value.y, 0.0, 0.02);
        this.uniforms.u_time.value = lerp(this.uniforms.u_time.value, 0.0, 0.02);
    }
}


class Sketch {
    constructor() {
        this.body = document.querySelector('body');

        this.images = [...document.querySelectorAll('img')];
        
        this.scrollable = document.querySelector(".smooth-scroll");
        this.current = 0;
        this.target = 0;
        this.ease = 0.065;

        this.meshItems = [];
        this.planeItems = [];

        this.mouseCoordinates = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.selectMesh = null;
        this.onMouse();
        this.onTouchMove();

        this.createScene()
        this.createCamera();
        this.createMesh();
        this.initRenderer();
        this.render();        
    }

    onTouchMove() {
        document.addEventListener("touchmove", (event) => {
            const x = (event?.touches[0].clientX / window.innerWidth) * 2 - 1;
            const y = -(event?.touches[0].clientY / window.innerHeight) * 2 + 1;
            this.mouseCoordinates = { x, y: window.innerWidth > 450 ? y : 0. };
        })
    }

    onMouse() {
        document.addEventListener("mousemove", (event) => {
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            const y = -(event.clientY / window.innerHeight) * 2 + 1;
            this.mouseCoordinates = { x, y }
        })
    }

    imageLoaded(url) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () {
                resolve(url);
            };
            img.onerror = function () {
                reject(url);
            };
            img.src = url;
        });
    }

    smoothScroll = () => {
        this.target = window.scrollY;
        this.current = lerp(this.current, this.target, this.ease);
        this.scrollable.style.transform = `translate3d(0,${-this.current}px, 0)`;
    };

    get viewport() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspectRatio = width / height;
        return { width, height, aspectRatio };
    }

    createScene() {
        this.scene = new THREE.Scene();
    }

    createCamera() {
        const perspective = 1000;
        const fov = (180 * (2 * Math.atan(window.innerHeight / 2 / perspective))) / Math.PI;
        this.camera = new THREE.PerspectiveCamera(fov, this.viewport.aspectRatio, 1, 1000)
        this.camera.position.set(0, 0, perspective);
    }

    createMesh() {
        const imagesLoaded = this.images.map((image) => {
            const meshItem = new MeshItem(image, this.scene);
            this.meshItems.push(meshItem);
            return this.imageLoaded(image.src);
        })

        Promise.all(imagesLoaded).then(() => {
            document.body.style.height = `${this.scrollable.getBoundingClientRect().height}px`;
        })

        this.scene.traverse((item) => {
            if (item.isMesh) {
                this.planeItems.push(item);
            }
        })
    }

    onWindowResize() {
        document.body.style.height = `${this.scrollable.getBoundingClientRect().height}px`;
        this.camera.aspect = this.viewport.aspectRatio;
        this.createCamera();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.viewport.width, this.viewport.height);
    }

    initRenderer() {
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.renderer = new THREE.WebGL1Renderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.viewport.width, this.viewport.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.body.appendChild(this.renderer.domElement);
    }

    render() {
        this.smoothScroll();

        this.raycaster.setFromCamera(this.mouseCoordinates, this.camera);
        const intersects = this.raycaster.intersectObjects(this.planeItems, true);
        if (intersects.length > 0) {
            this.selectMesh = intersects[0].object;
        } else {
            if (this.selectMesh !== null) {
                this.selectMesh = null;
            }
        }

        const velocity = (this.target - this.current);

        for (let i = 0; i < this.meshItems.length; i++) {
            this.meshItems[i].render(velocity, this.mouseCoordinates, this.selectMesh);
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.render.bind(this));
    }
}

new Sketch()
