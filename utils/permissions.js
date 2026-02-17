module.exports = {

  podeEditar(editorMember, targetMember) {
    return editorMember.roles.highest.position > targetMember.roles.highest.position;
  },

  podeDarCargo(editorMember, role) {
    return editorMember.roles.highest.position > role.position;
  }

};