/*/ 
const ESTADOS = {
  0: 'Pendiente',
  1: 'En proceso',
  2: 'Respondida',
  3: 'Cerrada'
};

const formCrear = document.getElementById('form-crear');
const listaPqrs = document.getElementById('lista-pqrs');
const filtroEstado = document.getElementById('filtro-estado');
const btnRefrescar = document.getElementById('btn-refrescar');
const mensajeCrear = document.getElementById('mensaje-crear');

async function cargarPqrs() {
  listaPqrs.innerHTML = '<p class="estado-carga">Cargando PQRS...</p>';
  try {
    const params = new URLSearchParams();
    if (filtroEstado.value !== '') params.set('estado', filtroEstado.value);

    const respuesta = await fetch(`/api/pqrs?${params.toString()}`);
    const data = await respuesta.json();

    if (!data.ok) {
      listaPqrs.innerHTML = `<p class="estado-error">${data.mensaje}</p>`;
      return;
    }
    if (data.datos.length === 0) {
      listaPqrs.innerHTML = '<p class="estado-vacio">No hay PQRS registradas todavía.</p>';
      return;
    }

    listaPqrs.innerHTML = '';
    data.datos.forEach((pqrs) => listaPqrs.appendChild(crearTarjetaPqrs(pqrs)));
  } catch (error) {
    listaPqrs.innerHTML = '<p class="estado-error">No fue posible conectar con el servidor.</p>';
  }
}

function crearTarjetaPqrs(pqrs) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta-pqrs';
  tarjeta.innerHTML = `
    <header>
      <h3>${escaparHtml(pqrs.asunto)}</h3>
      <span class="etiqueta-estado etiqueta-estado-${pqrs.estado}">${ESTADOS[pqrs.estado] ?? 'Desconocido'}</span>
    </header>
    <p class="meta">#${pqrs.id} · ${escaparHtml(pqrs.solicitante)} · ${formatearFecha(pqrs.fecha_hora)}</p>
    <div class="detalle" hidden></div>
    <button type="button" class="btn-detalle">Ver detalle</button>
  `;

  const btnDetalle = tarjeta.querySelector('.btn-detalle');
  const contenedorDetalle = tarjeta.querySelector('.detalle');

  btnDetalle.addEventListener('click', async () => {
    if (!contenedorDetalle.hidden) {
      contenedorDetalle.hidden = true;
      btnDetalle.textContent = 'Ver detalle';
      return;
    }
    contenedorDetalle.hidden = false;
    btnDetalle.textContent = 'Ocultar detalle';
    contenedorDetalle.innerHTML = 'Cargando detalle...';

    const respuesta = await fetch(`/api/pqrs/${pqrs.id}`);
    const data = await respuesta.json();
    if (!data.ok) {
      contenedorDetalle.innerHTML = `<p class="estado-error">${data.mensaje}</p>`;
      return;
    }
    contenedorDetalle.innerHTML = renderizarDetalle(data.datos);

    const formResponder = contenedorDetalle.querySelector('.form-responder');
    if (formResponder) {
      formResponder.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        await responderPqrs(pqrs.id, formResponder);
      });
    }
  });

  return tarjeta;
}

function renderizarDetalle(detalle) {
  let html = `<p class="cuerpo-pqrs">${escaparHtml(detalle.cuerpo)}</p>`;

  if (detalle.respuesta) {
    html += `
      <div class="bloque-respuesta">
        <strong>Respuesta de ${escaparHtml(detalle.respuesta.administrador)}</strong>
        <p>${escaparHtml(detalle.respuesta.cuerpo)}</p>
      </div>
    `;
  } else {
    html += `
      <form class="form-responder">
        <label>
          ID administrador
          <input type="number" name="id_usuario_administrador" min="1" required>
        </label>
        <label>
          Asunto de la respuesta
          <input type="text" name="asunto" required>
        </label>
        <label>
          Respuesta
          <textarea name="cuerpo" rows="3" required></textarea>
        </label>
        <button type="submit">Enviar respuesta</button>
        <p class="mensaje-form"></p>
      </form>
    `;
  }
  return html;
}

async function responderPqrs(idPqrs, formulario) {
  const mensaje = formulario.querySelector('.mensaje-form');
  const datos = {
    id_usuario_administrador: Number(formulario.id_usuario_administrador.value),
    asunto: formulario.asunto.value,
    cuerpo: formulario.cuerpo.value
  };

  try {
    const respuesta = await fetch(`/api/pqrs/${idPqrs}/respuesta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const data = await respuesta.json();
    mensaje.textContent = data.mensaje;
    mensaje.className = `mensaje-form ${data.ok ? 'exito' : 'error'}`;
    if (data.ok) setTimeout(cargarPqrs, 800);
  } catch (error) {
    mensaje.textContent = 'No fue posible enviar la respuesta.';
    mensaje.className = 'mensaje-form error';
  }
}

formCrear.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = {
    id_usuario: Number(formCrear.id_usuario.value),
    asunto: formCrear.asunto.value,
    cuerpo: formCrear.cuerpo.value
  };

  try {
    const respuesta = await fetch('/api/pqrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const data = await respuesta.json();
    mensajeCrear.textContent = data.mensaje;
    mensajeCrear.className = `mensaje-form ${data.ok ? 'exito' : 'error'}`;
    if (data.ok) {
      formCrear.reset();
      cargarPqrs();
    }
  } catch (error) {
    mensajeCrear.textContent = 'No fue posible conectar con el servidor.';
    mensajeCrear.className = 'mensaje-form error';
  }
});

btnRefrescar.addEventListener('click', cargarPqrs);
filtroEstado.addEventListener('change', cargarPqrs);

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatearFecha(fechaHora) {
  if (!fechaHora) return '';
  const fecha = new Date(fechaHora.replace(' ', 'T'));
  if (Number.isNaN(fecha.getTime())) return fechaHora;
  return fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

cargarPqrs();
*/