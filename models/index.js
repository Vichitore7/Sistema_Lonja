import db from '../config/db.js';
import Lote from './Lote.js';
import Especie from './Especie.js';
import Tipo from './Tipo.js';
import Comprador from './Comprador.js';
import Compra from './Compra.js';
import Usuario from './Usuario.js';

const restringir = { onDelete: 'RESTRICT', onUpdate: 'CASCADE' };

// Lote 1:N Especie (cada especie tiene exactamente un id_lte)
Lote.hasMany(Especie, { foreignKey: { name: 'id_lte', allowNull: false }, as: 'especies', ...restringir });
Especie.belongsTo(Lote, { foreignKey: { name: 'id_lte', allowNull: false }, as: 'lote', ...restringir });

// Tipo 1:N Especie
Tipo.hasMany(Especie, { foreignKey: { name: 'id_tpo', allowNull: false }, as: 'especies', ...restringir });
Especie.belongsTo(Tipo, { foreignKey: { name: 'id_tpo', allowNull: false }, as: 'tipo', ...restringir });

// Comprador 1:N Compra
Comprador.hasMany(Compra, { foreignKey: { name: 'codigo_cpr', allowNull: false }, as: 'compras', ...restringir });
Compra.belongsTo(Comprador, { foreignKey: { name: 'codigo_cpr', allowNull: false }, as: 'comprador', ...restringir });

// Lote 1:0..1 Compra -> Compra.id_lte FK UNIQUE NOT NULL (un lote se vende como máximo una vez)
Lote.hasOne(Compra, { foreignKey: { name: 'id_lte', allowNull: false, unique: true }, as: 'compra', ...restringir });
Compra.belongsTo(Lote, { foreignKey: { name: 'id_lte', allowNull: false, unique: true }, as: 'lote', ...restringir });

export { db, Lote, Especie, Tipo, Comprador, Compra, Usuario };
