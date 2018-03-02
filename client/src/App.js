import React from 'react';
import { Modal, Button, ButtonToolbar, DropdownButton, MenuItem, ListGroup, ListGroupItem, FormControl, Glyphicon, Panel, Well } from 'react-bootstrap';
import FontAwesome from 'react-fontawesome';

import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../node_modules/bootstrap/dist/css/bootstrap-theme.min.css';
import '../node_modules/font-awesome/css/font-awesome.min.css';

class App extends React.Component {
  constructor() {
    super();
    this.state = { tweets: [], showModal: false, input: "" };
    this.ENDPOINT_URL = "https://yer2wph4n1.execute-api.ap-northeast-1.amazonaws.com/dev/";

    this.tweet        = this.tweet.bind(this);
    this.openModal    = this.openModal.bind(this);
    this.closeModal   = this.closeModal.bind(this);
    this.inputUpdate  = this.inputUpdate.bind(this);
  }

  componentDidMount() {
    this.search("global_hist");
  }

  onChange(e){
    this.search(e.target.value);
  }

  inputUpdate(e) {
    this.setState({ input: e.target.value });
  }

  openModal() {
    this.setState({ showModal: true });
  }

  closeModal() {
    this.setState({ showModal: false });
  }

  apiCall(param) {
    return window.fetch(this.ENDPOINT_URL, { method: 'POST', body: JSON.stringify(param) })
      .then(data => data.json())
      .then(data => {
        if (data.error) {
          console.log("API_ERROR", data);
          alert(`リクエストでエラーが発生しました。しばらく経って再度エラーになってもゴミなのであきらめてください。(${data.error})`);
        } else {
          return data;
        }
      })
      .catch(err => {
        console.log("SERVER_ERROR", err);
        alert(`サーバでエラーが発生しました。ゴミなのであきらめてください。(${err.message})`);
      });
  }

  search(type){
    let param;
    if (type === "global_hist") param = { command: "list" };
    if (type === "my_hist")     param = { command: "list", member_id: "celeron1ghz" };
    //if (type === "global_rank") param = {};
    //if (type === "my_rank")     param = {};

    console.log("SEARCH_PARAM", param);

    this.apiCall(param).then(data => {
      this.setState({ tweets: data });
    });
  }

  tweet(tweet) {
    //window.confirm(tweet.tweet);
    console.log("TWEET");
    this.apiCall({ command: 'tweet', member_id: "mogemoge", tweet: "poyopoyopoyo" });
  }

  render() {
    const { tweets, showModal, input } = this.state;

    return <div className="container">
      <br/>
      <Well bsSize="small" className="clearfix">
        <span onClick={() => alert("バーーーカwwwwwwwwwwwwwwwwwwww")}>
          <Glyphicon glyph="trash"/>
          Gomitter
          <Glyphicon glyph="trash"/>
        </span>
        <div className="pull-right">
          {
            <ButtonToolbar>
              <DropdownButton pullRight
                bsStyle="success"
                bsSize="xsmall"
                id="dropdown-size-extra-small"
                title={<Glyphicon glyph="fire"/>}>
                  <MenuItem eventKey="1" onClick={this.openModal}><Glyphicon glyph="plus"/> 新規ツイート</MenuItem>
                  <MenuItem divider />
                  <MenuItem eventKey="2"><Glyphicon glyph="log-out"/> ログアウト</MenuItem>
              </DropdownButton>
            </ButtonToolbar>
          }
        </div>
      </Well>

      <Panel bsStyle="info">
        <Panel.Heading><Glyphicon glyph="search"/> 検索するゴミの条件</Panel.Heading>
        <Panel.Body>
          <FormControl componentClass="select" placeholder="select" onChange={this.onChange.bind(this)}>
            <option value="global_hist">みんなが使ったゴミ</option>
            <option value="my_hist">自分が使ったゴミ</option>
          </FormControl>
        </Panel.Body>
      </Panel>

      <Panel bsStyle="default">
        <Panel.Heading><Glyphicon glyph="trash"/> みんなが使ったゴミ</Panel.Heading>
        <ListGroup>
          {
            tweets.map(t =>
              <ListGroupItem key={t.id} style={{ whiteSpace: "pre" }} onClick={this.tweet.bind(this,t)}>
                {t.tweet}
                <div className="text-muted">
                  <Glyphicon glyph="user"/> {t.member_id}
                  &nbsp;&nbsp;
                  <Glyphicon glyph="time"/> {new Date(t.created_at * 1000).toISOString()}
                </div>
              </ListGroupItem>
            )
          }
        </ListGroup>
      </Panel>

      <Modal show={showModal} onHide={this.closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Glyphicon glyph="plus"/> 新規にゴミをつくる ({input.length}/140)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControl componentClass="textarea" placeholder="(ゴミを入力)" rows={10} onChange={this.inputUpdate} value={input}/>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.closeModal}><Glyphicon glyph="remove"/> 閉じる</Button>
          <Button bsStyle="primary" onClick={this.closeModal}><FontAwesome name="twitter"/> Tweet</Button>
        </Modal.Footer>
      </Modal>
    </div>;
  }
}

export default App;