import React from 'react';
import { Button, ButtonToolbar, DropdownButton, MenuItem, ListGroup, ListGroupItem, FormControl, Glyphicon, Panel, Well } from 'react-bootstrap';

class App extends React.Component {
  constructor() {
    super();
    this.state = { tweets: [] };
    this.ENDPOINT_URL = "https://yer2wph4n1.execute-api.ap-northeast-1.amazonaws.com/dev/";

    this.tweet = this.tweet.bind(this);
  }

  componentDidMount() {
    this.search("global_hist");
  }

  onChange(e){
    this.search(e.target.value);
  }

  search(type){
    let param;
    if (type === "global_hist") param = { command: "list" };
    if (type === "my_hist")     param = { command: "list", member_id: "celeron1ghz" };
    //if (type === "global_rank") param = {};
    //if (type === "my_rank")     param = {};

    console.log("SEARCH_PARAM", param);
    window.fetch(this.ENDPOINT_URL, { method: 'POST', body: JSON.stringify(param) })
      .then(data => data.json())
      .then(data => {
        if (data.error) {
          console.log(data);
        } else {
          this.setState({ tweets: data });
        }
      })
      .catch(err => {
        console.log(err);
      });
  }

  tweet(tweet) {
    //window.confirm(tweet.tweet);
    console.log("TWEET");
    window.fetch(this.ENDPOINT_URL, { method: 'POST', body: JSON.stringify({ command: 'tweet' }) })
      .then(data => data.json())
      .then(data => {
        if (data.error) {
          console.log(data);
        } else {
          console.log(data);
        }
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    const { tweets } = this.state;

    return <div className="container">
      <br/>
      <Well bsSize="small" className="clearfix">
        <span onClick={() => alert("バーーーカwwwwwwwwwwwwwwwwwwww")}>
          <Glyphicon glyph="trash"/><Glyphicon glyph="trash"/><Glyphicon glyph="trash"/>
          Gomitter
          <Glyphicon glyph="trash"/><Glyphicon glyph="trash"/><Glyphicon glyph="trash"/>
        </span>
        <div className="pull-right">
          {
            <ButtonToolbar>
              <DropdownButton
                bsStyle="success"
                bsSize="xsmall"
                id="dropdown-size-extra-small"
                title={"aaasss"}>
                  <MenuItem eventKey="1">aaaa</MenuItem>
                  <MenuItem eventKey="2">ログアウト</MenuItem>
              </DropdownButton>
            </ButtonToolbar>
          }
        </div>
      </Well>

<Button onClick={this.tweet}>aaa</Button>

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
    </div>;
  }
}

export default App;