// Quando o usuário clica no botão, usa o toggle para alternar entre mostrar ou não o conteúdo
function mostrarMenu(menuId) {
  // https://javascript.info/bubbling-and-capturing
  if (window.event) {
    window.event.stopPropagation();
  }
  const menu = document.getElementById(menuId);
  if (menu) {
    menu.classList.toggle("show");
  }
}

// Fecha o menu quando o usuário clica fora dele
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn') && !event.target.closest('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

function fecharDropdowns() {
  var dropdowns = document.getElementsByClassName("dropdown-content");
  for (var i = 0; i < dropdowns.length; i++) {
    dropdowns[i].classList.remove('show');
  }
}