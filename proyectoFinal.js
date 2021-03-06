 import Tags from "https://cdn.jsdelivr.net/gh/lekoala/bootstrap5-tags@master/tags.js";
    Tags.init("select[multiples]");

//Clases
class Persona{
    constructor(nombre, id) {
        this.nombre = nombre;
        this.id = id;
    }
}
class Deuda {
    constructor (fecha, total, pagador, personasIncluidasEnGasto, descripcion){
        this.fecha = fecha;
        this.total = total;
        this.pagador = pagador;
        this.personas = personasIncluidasEnGasto;
        this.cantidadPersonas = this.personas.length+1;
        this.descripcion = descripcion;
        this.pagadoPorPersona = pagadoPorPersona(this);
        this.estado = "A saldar";
    }    
}
class Grupo {
    constructor(nombre, descripcion, integrantes){
        this.nombre = nombre;
        this.descripcion= descripcion;
        this.integrantes = integrantes;
        this.deudas = [];
    }
}
//Variables globales
let usuarioPrincipal; 
let grupos = [];
let indiceGrupoSeleccionado = 0;

//Si encuentra el nombre del usuario principal
usuarioPrincipal = localStorage.getItem("0");
if (usuarioPrincipal == null){ //Debería ser la primera vez que abre
    //Por las dudas limpiar storage
    localStorage.clear();
    popup("#popupUserPrincipal", "show");
}else{ //puede haber grupos
    iniciar();
}

//Eventos Usuario principal
document.getElementById("añadirUserPrincipal").addEventListener("click", validarUserPrincipal);
document.getElementById("usuarioNuevo").addEventListener("keypress", cancelarEnter);
//Eventos para el boton de sesión
document.getElementById("sesion").addEventListener("click", cerrarSesion);
//Eventos para añadir los gastos.
document.getElementById("agregarGasto").addEventListener("click", validarGasto);
document.getElementById("cancelarGasto").addEventListener("click", () =>{popup("#exampleModal", "hide")});
document.getElementById("gastoNuevoAñadir").addEventListener("click", validarFormGasto);
document.getElementById("cerrarPopup").addEventListener("click", () =>{popup("#exampleModal", "hide")});
document.getElementById("gastoNuevo").addEventListener("sumbit", function(event){event.preventDefault()}); //prevenir el sumbit del form
//Eventos para grupos
document.getElementById("cancelarGrupo").addEventListener("click", () =>{popup("#popupNuevoGrupo", "hide")});
document.getElementById("cerrarPopupGrupo").addEventListener("click", () =>{popup("#popupNuevoGrupo", "hide")});
document.getElementById("agregarGrupo").addEventListener("click", ()=> {popup("#popupNuevoGrupo","show");});
document.getElementById("añadirGrupo").addEventListener("click", agregarGrupo);
document.getElementById("pagadoPorMi").addEventListener("change", validarCheck);
document.getElementById("pagador").addEventListener("change", validarOpciones);
document.getElementById("cerrarPopupEditarGrupo").addEventListener("click", () =>{popup("#popupEditarGrupo", "hide")});
document.getElementById("editGrupo").addEventListener("click", () =>{
    popup("#popupEditarGrupo", "show")
    document.getElementById("nombreGrupoEditar").value = grupos[indiceGrupoSeleccionado].nombre;
    document.getElementById("descripcionGrupoEditar").value = grupos[indiceGrupoSeleccionado].descripcion;
    //No me puedo traer los integrantes, quedan en el select pero no escritos en los tags.
});
document.getElementById("cancelarEditarGrupo").addEventListener("click", () =>{popup("#popupEditarGrupo", "hide")});
document.getElementById("editarGrupo").addEventListener("click", editarGrupo);
document.getElementById("randomGroup").addEventListener("click", crearGrupoAleatorio);
//Eventos para eliminar Gastos
document.getElementById("eliminarGastos").addEventListener("click",eliminarGastos);
//Eventos para saldar Gastos
document.getElementById("saldarGasto").addEventListener("click",saldarGastosSeleccionados);

//Funciones
function iniciar(){
    //Traigo los grupos
    usuarioPrincipal = JSON.parse(localStorage.getItem("0"));
    let sesion = document.getElementById("sesion");
    sesion.innerText = usuarioPrincipal.nombre + " (Cerrar sesion)";
    sesion.style.visibility = "visible";
    actualizarTodosLosGrupos();
}

function cerrarSesion(){
    localStorage.clear();
    location.reload();
}

function actualizarTodosLosGrupos(){
    grupos = [];
    limpiarNodo(document.getElementById("gruposNuevitos"));
    for (let i = 0; i< localStorage.length; i++){
        if(/^Grupo/.test(localStorage.key(i))){
            let grupoActual = JSON.parse(localStorage.getItem(localStorage.key(i)))
            grupos.push(grupoActual);
            actualizarDetallesGrupo(grupos[grupos.length-1],i);
            agregarEventListener(i);
        }
    }
    if(grupos.length !=0){
        traerInfoGrupoActual(indiceGrupoSeleccionado);
        actualizarTarjetas(indiceGrupoSeleccionado);
    }else{
        limpiarTabla();
        limpiardetalleGrupo();
        actualizarTarjetas(-1); //Le paso este valor que sería para poner las cartas en 0
    }
}

function limpiarTabla(){
    let filas = document.getElementById("movimientos");
    while(filas.hasChildNodes()){
        filas.removeChild(filas.lastChild)
    }
}

function crearGrupoAleatorio(){
    let numero = Math.floor((Math.random() * (11-5))+5);
    let personas = [];
    personas.push(usuarioPrincipal);
    console.log(numero);
    fetch(`https://randomuser.me/api/?results=${numero}&nat=ES&inc=name`)
    .then( (res) => res.json())
    .then( (data) => {
        for(let i = 0 ; i<numero ; i++){
            let persona = new Persona(data.results[i].name.first,1);
            personas.push(persona);
        }
        let aleatId = verificarNumeroAleatorio();
        let grupo = new Grupo("Aleatorio " + (aleatId),"Es un grupo aleatorio",personas)
        guardarGrupo(grupo);
    })
}

function verificarNumeroAleatorio(){
    let contador = 0;
    for (let i = 0; i< localStorage.length; i++){
        if(/^Grupo Aleatorio/.test(localStorage.key(i))){
            contador ++;
        }
    }
    return contador;
}

function limpiardetalleGrupo(){
    document.getElementById("detGrupo").innerText = "Detalles del grupo";
    document.getElementById("integrantesActuales").innerHTML = ` <h4 >Integrantes:</h4>`;
    document.getElementById("detDescripcion").innerText = "" 
}

function validarFormGasto(){
   let monto = document.getElementById("monto").value;
   monto == "" ? Swal.fire({text: "Debe ingresar un monto", confirmButtonColor:"#0d6efd"}) : gastoNuevoAñadir();
}

function gastoNuevoAñadir(){
    let fecha = document.getElementById("fecha").value;
    let monto  = parseFloat(document.getElementById("monto").value);
    let descripcion = document.getElementById("descripcion").value;
    let pagador  = document.getElementById("pagador");
    let deudores = []; 
    let opciones = document.getElementById("checkDeudores");
    let cantidadChecks = opciones.children.length;
    for(let i = 0; i<cantidadChecks; i++){
        let ch = document.getElementById("ch"+i);
        let deudor;
        if (ch.checked){
            deudor = grupos[indiceGrupoSeleccionado].integrantes[i];                              
            deudores.push(deudor); 
        }
    }
    pagador = grupos[indiceGrupoSeleccionado].integrantes[pagador.selectedIndex];                 
    let deuda = new Deuda(fecha, monto, pagador, deudores, descripcion);
    agregarGastoATabla(deuda);
    //Reseteo y escondo el form
    document.getElementById("gastoNuevo").reset();
    popup("#exampleModal", "hide");
    //Agregar gasto al grupo
    grupos[indiceGrupoSeleccionado].deudas.push(deuda);                                          
    actualizarGrupo(indiceGrupoSeleccionado);
    actualizarTarjetas(indiceGrupoSeleccionado); 
    toasty("Gasto añadido", "#e0ffdd")
}

function noHayGrupo(){
    return grupos.length == 0;
}

function agregarGastoATabla(gasto){
    let tabla = document.getElementById("movimientos");
    //inserto una fila a la tabla
    let filaAgregada = tabla.insertRow();
    //inserto las celdas de las filas
    let seleccionar = filaAgregada.insertCell(0);
    let date = filaAgregada.insertCell(1);
    let descr = filaAgregada.insertCell(2);	
    let precio = filaAgregada.insertCell(3);
    let pagadoPor = filaAgregada.insertCell(4);
    let deudores = filaAgregada.insertCell(5);
    let deuda = filaAgregada.insertCell(6);
    let saldoAFavor = filaAgregada.insertCell(7);
    let state = filaAgregada.insertCell(8);
    let {pagadoPorPersona,pagador,personas,total,fecha,descripcion,estado} = gasto; //Desetructuro
    // Pongo los datos de la deuda en las celdas.
    state.innerText = estado;
    date.innerText = fecha;
    descr.innerText = descripcion;
    precio.innerText = "$" + parseFloat(total).toFixed(2);
    pagadoPor.innerText = pagador.nombre;
    deudores.innerText =  obtenerDeudoresOrdenados(gasto);
    deuda.innerText = "$" + pagadoPorPersona;
    saldoAFavor.innerText = "$" +  (pagadoPorPersona * (personas.length)).toFixed(2); 
    let botonEliminar = document.createElement("input");
    botonEliminar.type = "checkbox";
    seleccionar.className ="td align-middle";
    seleccionar.append(botonEliminar);
}

function actualizarGrupo(indiceGrupo){
    localStorage.setItem(`Grupo ${grupos[indiceGrupo].nombre}`, JSON.stringify(grupos[indiceGrupo]));
}

function eliminarGastos(){
    let movimientos = document.getElementById("movimientos");
    for(let i = movimientos.children.length-1 ; i>= 0 ;i --){
        if(movimientos.children[i].cells[0].children[0].checked){
            movimientos.removeChild(movimientos.children[i]);
            grupos[indiceGrupoSeleccionado].deudas.splice(i,1);
        }
    }
    actualizarGrupo(indiceGrupoSeleccionado); //Actualizo en el storage el grupo
    actualizarTarjetas(indiceGrupoSeleccionado);
    toasty("Gasto eliminado correctamente", "#e0ffdd");
}

function saldarGastosSeleccionados(){
    let movimientos = document.getElementById("movimientos");
    for(let i = movimientos.children.length-1 ; i>= 0 ;i --){
        if(movimientos.children[i].cells[0].children[0].checked){
            grupos[indiceGrupoSeleccionado].deudas[i].estado = "Saldada"
        }
    }
    actualizarGrupo(indiceGrupoSeleccionado);
    actualizarTarjetas(indiceGrupoSeleccionado);
    recuperarGastosGrupo(indiceGrupoSeleccionado);
    toasty("Deuda saldada correctamente", "#e0ffdd");
}

function obtenerDeudoresOrdenados(deuda){
    let deudores = deuda.personas;
    let nombreDeudores = [];
    for (const nombre of deudores) {
        nombreDeudores.push(nombre.nombre);
    }
    nombreDeudores.sort();
    return  nombreDeudores.join(", ");
}

function pagadoPorPersona(deuda){
    let pagadoPorPersona = deuda.total/deuda.cantidadPersonas;
    console.log(pagadoPorPersona);
    return pagadoPorPersona.toFixed(2);
}

function popup(id, accion){
    $(id).modal(accion);
}

function recuperarGastosGrupo(indiceGrupo){
    //Limpio la tabla
    limpiarTabla();
    for (const d of grupos[indiceGrupo].deudas) {
        agregarGastoATabla(d);
    }
}

function integrantesFinales(integrantesDOM){
    let integrantesFinales = [];
    integrantesFinales.push(usuarioPrincipal);
    for (const integrante of integrantesDOM) {
        let i = 1;
        if (integrante.selected){
            integrantesFinales.push(new Persona (integrante.value, i));
        }        
        i++;
    }
    return integrantesFinales; 
}

function guardarGrupo(grupo){
    let key  = validarStorageGrupo(grupo);
    if(key){
        localStorage.setItem(key,JSON.stringify(grupo));
        grupos.push(grupo);
        limpiarTabla();
        actualizarDetallesGrupo(grupos[grupos.length-1],grupos.length);
        agregarEventListener(grupos.length);
        indiceGrupoSeleccionado = grupos.length-1;   
        toasty("Grupo guardado", "#e0ffdd");
    }
    else{
        toasty("Ya existe un grupo con ese nombre", "#ff98a3")
    }

}

function agregarGrupo(){
    let nombre = document.getElementById("nombreGrupo").value;
    if(nombre == ""){
        Swal.fire({text: "Debe ingresar un nombre de grupo", confirmButtonColor:"#0d6efd"});
    }else{
        let descripcion = document.getElementById("descripcionGrupo").value;
        let integrantes = document.getElementById("integrantes");
        let integrantesFinal = [] 
        integrantesFinal = integrantesFinales(integrantes);
        let grupo = new Grupo(nombre,descripcion,integrantesFinal);
        document.getElementById("grupoNuevo").reset();
        popup("#popupNuevoGrupo", "hide");
        guardarGrupo(grupo);
    }
}

function actualizarDetallesGrupo(grupo, indiceEnStorage){
    let lugarAgregar = document.getElementById("gruposNuevitos");
    let listaNueva = document.createElement("li");
    let divPrincipal = document.createElement("div");
    let divGrupo = document.createElement("div");
    let divBasura = document.createElement("div");
    let nombreGrupo = document.createElement("a");
    let basura = document.createElement("a");
    let iconoGrupo = document.createElement("svg")
    let iconoBasura = document.createElement("svg")
    divPrincipal.className = "d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-0 pb-0 mb-0"
    divGrupo.className = "btn-toolbar mb-2 mb-md-0";
    divBasura.className = "btn-toolbar mb-2 mb-md-0";
    nombreGrupo.href = "#";
    basura.href = "#";
    nombreGrupo.className = "nav-link";
    basura.className = "nav-link";
    basura.id = "basura" + indiceEnStorage;
    nombreGrupo.id = "grupo" + indiceEnStorage;
    listaNueva.id = "lista" + indiceEnStorage;
    iconoGrupo.innerHTML = 
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-people-fill" viewBox="0 0 16 16">
            <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
            <path fill-rule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216z"/>
            <path d="M4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
        </svg> ${grupo.nombre}`;
    iconoBasura.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"></path>
            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"></path>
        </svg>`;
    //Agrego la lista de grupo.
    nombreGrupo.appendChild(iconoGrupo);
    basura.appendChild(iconoBasura);
    divGrupo.appendChild(nombreGrupo);
    divBasura.appendChild(basura);
    divPrincipal.appendChild(divGrupo);
    divPrincipal.appendChild(divBasura);
    listaNueva.appendChild(divPrincipal);
    lugarAgregar.appendChild(listaNueva);
    mostrarDatosGrupoPantallaPrincipal(grupo);
    actualizarTarjetas(indiceEnStorage-1)
}

function mostrarDatosGrupoPantallaPrincipal(grupo){
    let nombreIntegrantesFinales = [];
    for (const i of grupo.integrantes) {
        nombreIntegrantesFinales.push(i.nombre);        
    }
    document.getElementById("detGrupo").innerHTML = 
        ` <h2 id="detGrupo" >Detalles del grupo: ${grupo.nombre} </h2>`;
    document.getElementById("integrantesActuales").innerHTML = ` <h4 >Integrantes: ${nombreIntegrantesFinales.join(", ")} </h4> `;
    document.getElementById("detDescripcion").innerText = "Descripción: " + grupo.descripcion;
}

function agregarEventListener(indiceGrupo){
    let grupoActual = document.getElementById(`grupo${indiceGrupo}`);
    let basuraActual = document.getElementById(`basura${indiceGrupo}`);
    grupoActual.addEventListener("click", () =>{ traerInfoGrupoActual(indiceGrupo-1)});
    basuraActual.addEventListener("click",()=>{eliminarGrupoStorage(indiceGrupo-1)})

}

function traerInfoGrupoActual(indiceGrupo){
    let grupoActual = grupos[indiceGrupo];
    console.log(`Entraste a un grupo ${grupoActual.nombre}`);
    mostrarDatosGrupoPantallaPrincipal(grupoActual, indiceGrupo);
    recuperarGastosGrupo(indiceGrupo);
    actualizarTarjetas(indiceGrupo);
    indiceGrupoSeleccionado = indiceGrupo; 
    prepararOpcionesForms();
}

function eliminarGrupoStorage(indiceGrupo){
    let grupoABorrar = grupos[indiceGrupo];
    let key = `Grupo ${grupoABorrar.nombre}`;
    localStorage.removeItem(key);
    document.getElementById(`lista${indiceGrupo +1}`).remove();
    if(indiceGrupo == indiceGrupoSeleccionado){ 
        indiceGrupoSeleccionado = 0; //Me voy al primer grupo creado
        actualizarTodosLosGrupos(); //Actualizo las listas del costado y los grupos
        toasty("Grupo eliminado correctamente","#e0ffdd");
    }

}

function editarGrupo(){ 
    if(grupos.length != 0 ){
        let grupoAEditar = grupos[indiceGrupoSeleccionado];
        let nombre = document.getElementById("nombreGrupoEditar").value;
        let descripcion = document.getElementById("descripcionGrupoEditar").value;
        let integrantes = document.getElementById("integrantesEditar");
        let integrantesFinal = [];
        localStorage.removeItem(`Grupo ${grupos[indiceGrupoSeleccionado].nombre}`);
        integrantesFinal = integrantesFinales(integrantes);
        grupoAEditar.nombre = nombre;        
        grupoAEditar.descripcion = descripcion;        
        grupoAEditar.integrantes = integrantesFinal;
        grupoAEditar.deudas = grupos[indiceGrupoSeleccionado].deudas;
        grupos[indiceGrupoSeleccionado] = grupoAEditar;
        actualizarGrupo(indiceGrupoSeleccionado)
        actualizarTodosLosGrupos();
        document.getElementById("grupoEditar").reset();
        popup("#popupEditarGrupo", "hide");
        toasty("Grupo editado correctamente", "#e0ffdd");
        
    }else{
        Swal.fire({text: "No hay grupo para editar", confirmButtonColor:"#0d6efd"})
    }
}

function toasty(texto, color){
    Toastify({
        text: texto,
        position : "center",
        style: {
            background: color, //"#e0ffdd, 
            color: "black"
          },
        duration: 3000            
        }).showToast();
}

function actualizarTarjetas(indiceGrupo){
    let deuda = document.getElementById("tarjetaDeuda");
    let aFavor = document.getElementById("tarjetaFavor");
    let total = document.getElementById("tarjetaTotal");
    let subtotal = 0;
    let subDeuda = 0;
    let subFavor = 0;
    if(indiceGrupo != -1){
        for (const deuda of grupos[indiceGrupo].deudas) {
            subtotal += deuda.total
            if(deuda.estado == "A saldar"){
                if(deuda.pagador.id == 0){
                    subFavor += deuda.total - deuda.pagadoPorPersona;
                }else{
                    for (const persona of deuda.personas) {
                        if(persona.id == 0){
                            subDeuda += parseFloat(deuda.pagadoPorPersona);
                        }
                    }
                }
            }
        }    
    }
    deuda.innerText = `$ ${subDeuda.toFixed(2)}`;
    aFavor.innerText = `$ ${subFavor.toFixed(2)}`;
    total.innerText = `$ ${subtotal.toFixed(2)}`;
}

function limpiarNodo(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function cancelarEnter(){
    if(event.keyCode == 13){
        event.returnValue = false;
    }
}

function validarUserPrincipal(){
    let user;
    let usuario = document.getElementById("userPrincipal").value;
    if(usuario.localeCompare("") ==0){
        Swal.fire({text: "Ingrese nombres válido", confirmButtonColor:"#0d6efd"});
    }
    else{
        usuario = document.getElementById("userPrincipal").value;
        user = new Persona(usuario, 0);
        localStorage.setItem(user.id, JSON.stringify(user))
        popup("#popupUserPrincipal", "hide");
        usuarioPrincipal = JSON.parse(localStorage.getItem("0"));
        iniciar();
    }
}

function validarCheck(){
    if(document.getElementById("pagadoPorMi").checked){
        document.getElementById("pagador").disabled = true;
        document.getElementById("pagador").options.selectedIndex = 0;
    }else{
        document.getElementById("pagador").disabled = false;
    }
    validarOpciones();
}

function validarGasto(){
    if(noHayGrupo()){ //Si no hay grupos crear grupo
        Swal.fire({text: "Antes debe agregar un grupo", confirmButtonColor:"#0d6efd"})
        popup("#popupNuevoGrupo", "show")
    }else{
        prepararOpcionesForms(); 
        popup("#exampleModal", "show");
        validarOpciones();
    }
}

function validarOpciones(){
    let checks = document.getElementById("checkDeudores").children.length;
    let opcionElegida = document.getElementById("pagador").selectedIndex;
    let check = document.getElementById("ch" + opcionElegida);
    for(let i = 0; i<checks; i++){
        let checkActual = document.getElementById("ch" + i);
        checkActual.disabled = false;
    }
    check.disabled = true;
    check.checked = false;
}

function validarStorageGrupo(grupo){
    let key = "Grupo " + grupo.nombre;
    for (let i = 0; i< localStorage.length; i++){
        if("Grupo " + grupo.nombre == localStorage.key(i)){
            key = false;
        }
    }
    return key;
}

function prepararOpcionesForms(){
    let opcionesPagador = document.getElementById("pagador");
    let opcionesDeudor = document.getElementById("checkDeudores");
    //Limpio las opciones para no tener duplicados
    limpiarNodo(opcionesPagador);
    limpiarNodo(opcionesDeudor);
    let i = 0;
    //Agregar todos los integrantes del grupo
    for (const integrantes of grupos[indiceGrupoSeleccionado].integrantes) {
        //Select
        let opcion = document.createElement("option");
        opcion.text = integrantes.nombre;
        opcionesPagador.appendChild(opcion)
        //Checks
        let div = document.createElement("div");
        div.className = "form-check"
        let check = document.createElement("input");
        let label = document.createElement("label");
        check.type = "checkbox";
        check.id = "ch" + i;
        check.className = "form-check-input";
        check.value = integrantes.nombre;
        label.className = "form-check-label";
        label.htmlFor = "ch" + i;
        label.appendChild(document.createTextNode(integrantes.nombre));
        div.append(check);
        div.append(label);
        opcionesDeudor.append(div);
        i++;
    }
 }