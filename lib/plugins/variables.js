class Variable {
  constructor(variable) {
    this._variable = variable;
  }

  create(object) {
    return this._variable.create(object);
  }

  update(object) {
    return this._variable.update(object);
  }

  get() {
    return this._variable.get();
  }

  remove() {
    return this._variable.remove();
  }
}

class Variables {
  constructor(variables) {
    this._variables = variables;
  }

  list() {
    return this._variables.list();
  }

  variable(name) {
    return new Variable(this._variables.variable(name));
  }
}

module.exports = Variables;
