const getClientId = () => {
  let client_id =
    localStorage.getItem(
      "client_id"
    );

  if (!client_id) {
    client_id =
      crypto.randomUUID();

    localStorage.setItem(
      "client_id",
      client_id
    );
  }

  return client_id;
};

export default getClientId;