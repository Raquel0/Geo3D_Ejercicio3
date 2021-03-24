import * as THREE from './three.module.js';

import Stats from './stats.module.js';

import {
    OrbitControls
} from './OrbitControls.js';
import {
    ImprovedNoise
} from './ImprovedNoise.js';

// import {
//     DDSLoader
// } from './DDSLoader.js';

let container, stats;

let camera, controls, scene, renderer;

let mesh, texture;

// crear una cuadrícula de 5x5 caras = 6x6 vértices
const worldWidth = 6,
    worldDepth = 6,
    worldHalfWidth = worldWidth / 2,
    worldHalfDepth = worldDepth / 2;

let helper;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

init();
animate();

function init() {
    // CONTAINER
    container = document.getElementById('container');
    container.innerHTML = "";

    // RENDERER
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

    // SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444444);

    // CAMERA
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 10, 20000);

    // CONTROLS 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1000;
    controls.maxDistance = 10000;
    controls.maxPolarAngle = Math.PI / 2;


    // DEFINICION DE LOS VERTICES 
    //vértices de forma manual mediante un array que definamos
    const data = [1, 10, 2, 50, 8, 50, 9, 6, 5, 10, 2, 40, 3, 5, 88, 22, 15, 30, 0, 2, 5, 9, 50, 20, 9, 8, 40, 6, 3, 10, 1, 2, 3, 4, 5, 0];

    // CONTROLES SOBRE LOS VERTCES
    controls.target.y = data[worldHalfWidth + worldHalfDepth * worldWidth] + 500;
    camera.position.y = controls.target.y + 2000;
    camera.position.x = 2000;
    controls.update();

    // GEOMETRIA
    var geometry = new THREE.PlaneBufferGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {

        vertices[j + 1] = data[i] * 10;
    }

    geometry.computeFaceNormals(); // needed for helper


    // TEXTURA CONTINUA
    // texture = new THREE.CanvasTexture(generateTexture(data, worldWidth, worldDepth));
    // texture.wrapS = THREE.ClampToEdgeWrapping;
    // texture.wrapT = THREE.ClampToEdgeWrapping;

    // const loader = new DDSLoader();
    // const textura1 = loader.load('./textures/disturb_dxt1_mip.dds');


    // TEXTURA IMAGEN
    const textura1 = new THREE.TextureLoader().load('./textures/square-angle-white.png');
    textura1.wrapS = THREE.RepeatWrapping;
    textura1.wrapT = THREE.RepeatWrapping;
    const alto = 1
    const ancho = 900 / 512
    textura1.repeat.set(alto, ancho);
    // textura1.repeat.set(2 * alto, 2 * ancho);
    // textura1.repeat.set(5 * alto, 5 * ancho);


    // MALLA 
    var material = new THREE.MeshPhongMaterial({
        map: textura1,
        // color: 0xdda82b,
        transparent: true,
        opacity: 0.7,
        flatShading: true,
        shininess: 80
    });
    mesh = new THREE.Mesh(geometry, material);
    // mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ wireframe: true, color: 0xce2154 }));

    scene.add(mesh);


    // LUCES y sombras
    const light = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(4000, 3000, -1000); //default; light shining from top
    directionalLight.target.position.set(7000, 0, 1000);
    // directionalLight.target = mesh;

    scene.add(directionalLight);
    scene.add(directionalLight.target);

    // const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 400);
    // scene.add(directionalLightHelper);


    const geometryHelper = new THREE.ConeGeometry(20, 100, 3);
    geometryHelper.translate(0, 50, 0);
    geometryHelper.rotateX(Math.PI / 2);
    helper = new THREE.Mesh(geometryHelper, new THREE.MeshNormalMaterial());
    scene.add(helper);

    container.addEventListener('mousemove', onMouseMove);

    stats = new Stats();
    container.appendChild(stats.dom);

    //

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function generateHeight(width, height) {

    const size = width * height,
        data = new Uint8Array(size),
        perlin = new ImprovedNoise(),
        z = Math.random() * 100;

    let quality = 1;

    for (let j = 0; j < 4; j++) {

        for (let i = 0; i < size; i++) {

            const x = i % width,
                y = ~~(i / width);
            data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75);

        }

        quality *= 5;

    }

    return data;

}

// CONSTRUCCION DE LA TEXTURA 
function generateTexture(data, width, height) {

    // bake lighting into texture

    let context, image, imageData, shade;

    const vector3 = new THREE.Vector3(0, 0, 0);

    const sun = new THREE.Vector3(1, 1, 1);
    sun.normalize();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);

    image = context.getImageData(0, 0, canvas.width, canvas.height);
    imageData = image.data;

    for (let i = 0, j = 0, l = imageData.length; i < l; i += 4, j++) {

        vector3.x = data[j - 2] - data[j + 2];
        vector3.y = 2;
        vector3.z = data[j - width * 2] - data[j + width * 2];
        vector3.normalize();

        shade = vector3.dot(sun);

        imageData[i] = (96 + shade * 128) * (0.5 + data[j] * 0.007);
        imageData[i + 1] = (32 + shade * 96) * (0.5 + data[j] * 0.007);
        imageData[i + 2] = (shade * 96) * (0.5 + data[j] * 0.007);

    }

    context.putImageData(image, 0, 0);

    // Scaled 4x

    const canvasScaled = document.createElement('canvas');
    canvasScaled.width = width * 4;
    canvasScaled.height = height * 4;

    context = canvasScaled.getContext('2d');
    context.scale(4, 4);
    context.drawImage(canvas, 0, 0);

    image = context.getImageData(0, 0, canvasScaled.width, canvasScaled.height);
    imageData = image.data;

    for (let i = 0, l = imageData.length; i < l; i += 4) {

        const v = ~~(Math.random() * 5);

        imageData[i] += v;
        imageData[i + 1] += v;
        imageData[i + 2] += v;

    }

    context.putImageData(image, 0, 0);

    return canvasScaled;

}

//

function animate() {

    requestAnimationFrame(animate);

    render();
    stats.update();

}

function render() {

    renderer.render(scene, camera);

}

function onMouseMove(event) {

    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // See if the ray from the camera into the world hits one of our meshes
    const intersects = raycaster.intersectObject(mesh);

    // Toggle rotation bool for meshes that we clicked
    if (intersects.length > 0) {

        helper.position.set(0, 0, 0);
        helper.lookAt(intersects[0].face.normal);

        helper.position.copy(intersects[0].point);

    }

}