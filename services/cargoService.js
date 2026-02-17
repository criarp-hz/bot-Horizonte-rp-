const config = require("../config");

module.exports = {

  async setCargo(guild, member, cargoNumero) {
    const roleId = config.cargos[cargoNumero];
    const role = guild.roles.cache.get(roleId);
    if (!role) throw new Error("Cargo não existe");

    await member.roles.add(role);
    return role;
  },

  async removerCargo(guild, member, cargoNumero) {
    const roleId = config.cargos[cargoNumero];
    const role = guild.roles.cache.get(roleId);
    if (role) {
      await member.roles.remove(role);
    }
  },

  async trocarCargo(guild, member, cargoAntigo, cargoNovo) {
    if (cargoAntigo) {
      await this.removerCargo(guild, member, cargoAntigo);
    }
    return await this.setCargo(guild, member, cargoNovo);
  },

  async setNick(member, nick) {
    await member.setNickname(`『Ⓗ¹』 ${nick}`);
  },

  validarHierarquia(editor, target) {
    return editor.roles.highest.position > target.roles.highest.position;
  }

};